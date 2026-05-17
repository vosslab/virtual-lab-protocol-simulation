#!/usr/bin/env python3
"""
Render a mini-protocol YAML to a human-readable lab manual.

Third gate after `validation/yaml/content_lint.py` (syntax) and
`validation/stepper/step_check.py` (semantic flow). This tool renders the
authored YAML to markdown prose so a pedagogy reviewer can read every
mini end-to-end without parsing YAML. Reading prose surfaces a bug
class that neither static validation nor flow simulation can catch:
click-centric prompts, action-vs-end-state divergence, material
identity drift, inverted cause-effect modeling, and over-atomization
of steps.

Usage:
	source source_me.sh && python3 validation/manual/protocol_manual.py <protocol_name>
	source source_me.sh && python3 validation/manual/protocol_manual.py -p NAME [NAME ...]
	source source_me.sh && python3 validation/manual/protocol_manual.py --interactive
	source source_me.sh && python3 validation/manual/protocol_manual.py --list-protocols
	source source_me.sh && python3 validation/manual/protocol_manual.py --all

Single mode writes `./<protocol_name>.md` to the current working
directory. `--all` writes every protocol to `./output_manuals/`.
Override the directory with `--out <dir>`, or use `--stdout` to print
the rendered markdown to stdout instead of writing files.

Use `--lint` to emit authoring warnings to stderr (does not alter rendered
output). Checks for click-centric prompts, material-identity drift, and
set-volume vs computed-delta mismatches.

Reuses no validator or stepper code; reads YAML directly via pyyaml.
Translation templates are heuristic and live in this file. A future
plan can move per-object verbs into the object YAML schema so the
templates become content-driven rather than tool-driven.
"""

import os
import re
import sys
import yaml

import validation.shared_toolkit.paths as toolkit_paths
import validation.shared_toolkit.protocols as toolkit_protocols
import validation.shared_toolkit.interactive as toolkit_interactive
import validation.shared_toolkit.reporter as toolkit_reporter
import validation.shared_toolkit.cli as toolkit_cli

REPO_ROOT = toolkit_paths.REPO_ROOT
CONTENT_ROOT = toolkit_paths.CONTENT_ROOT
PROTOCOLS_DIR = toolkit_paths.PROTOCOLS_DIR
OBJECTS_DIR = toolkit_paths.OBJECTS_DIR

# Bulk-write directory. Per REPO_STYLE.md, reuse a stable CWD-relative
# folder ("output_*") instead of /tmp so the artifacts are visible next
# to the repo and survive across runs.
DEFAULT_BULK_OUT_DIR = "output_manuals"

# Prompt keywords that indicate a verification step. When a step prompt
# begins with one of these, a bare-click interaction on a tracked object
# renders as "Verify the X" instead of "Pick up the X".
VERIFY_PROMPT_KEYWORDS = ("verify", "confirm", "review", "check", "inspect")


#============================================
def load_yaml(path):
	"""Load and return parsed YAML."""
	with open(path, encoding="utf-8") as handle:
		data = yaml.safe_load(handle)
	return data


#============================================
class ObjectCatalog:
	"""
	Object library loader. Provides label, state-field unit, default, and
	capability lookups. Subpart-aware: dotted targets like
	well_plate_96.B1 resolve through the parent object's declared kind.
	"""

	def __init__(self):
		"""Read every object YAML and index by object_name."""
		self.objects = {}
		# Recursively scan OBJECTS_DIR and subdirectories for YAML files.
		for root, dirs, files in os.walk(toolkit_paths.OBJECTS_DIR):
			for filename in sorted(files):
				if not filename.endswith(".yaml"):
					continue
				path = os.path.join(root, filename)
				obj = load_yaml(path)
				name = obj["object_name"]
				self.objects[name] = obj

	#--------------------------------------------
	def label(self, target):
		"""
		Display label for a target. Handles dotted subparts by composing
		the subpart name with the parent's semantic kind.
		"""
		if "." in target:
			parent, subpart = target.split(".", 1)
			parent_obj = self.objects.get(parent)
			if parent_obj is None:
				return target
			parent_label = parent_obj.get("label", parent)
			kind = parent_obj.get("kind", "")
			if kind == "plate":
				# well_plate_96.B1 -> "well B1 of the 96-well plate"
				return f"well {subpart} of the {parent_label}"
			if kind == "rack":
				# dilution_tube_rack_8.tube_A -> "tube A of the rack"
				readable_subpart = subpart.replace("tube_", "tube ")
				return f"{readable_subpart} of the {parent_label}"
			return f"{subpart} of the {parent_label}"
		obj = self.objects.get(target)
		if obj is None:
			return target
		return obj.get("label", target)

	#--------------------------------------------
	def unit_for_field(self, target, field_name):
		"""
		Return declared unit for object.field. Walks through subpart
		parent's state_fields and subparts.state_fields to resolve units
		for structured objects.
		"""
		object_name = target.split(".", 1)[0] if "." in target else target
		obj = self.objects.get(object_name)
		if obj is None:
			return ""
		for entry in obj.get("state_fields", []) or []:
			if entry.get("field_name") == field_name:
				return entry.get("unit", "") or ""
		subparts_def = obj.get("subparts", {}) or {}
		for entry in subparts_def.get("state_fields", []) or []:
			if entry.get("field_name") == field_name:
				return entry.get("unit", "") or ""
		return ""

	#--------------------------------------------
	def default_for_field(self, target, field_name):
		"""Return declared default for object.field."""
		object_name = target.split(".", 1)[0] if "." in target else target
		obj = self.objects.get(object_name)
		if obj is None:
			return None
		for entry in obj.get("state_fields", []) or []:
			if entry.get("field_name") == field_name:
				return entry.get("default")
		subparts_def = obj.get("subparts", {}) or {}
		for entry in subparts_def.get("state_fields", []) or []:
			if entry.get("field_name") == field_name:
				return entry.get("default")
		return None

	#--------------------------------------------
	def kind(self, target):
		"""Return declared kind for an object."""
		object_name = target.split(".", 1)[0] if "." in target else target
		obj = self.objects.get(object_name)
		if obj is None:
			return ""
		return obj.get("kind", "")


#============================================
def load_material_labels(protocol_name):
	"""Load this protocol's materials.yaml; return name -> label dict."""
	path = os.path.join(toolkit_paths.PROTOCOLS_DIR, protocol_name, "materials.yaml")
	if not os.path.isfile(path):
		return {}
	data = load_yaml(path)
	materials = data.get("materials", {}) or {}
	labels = {}
	for name, material in materials.items():
		labels[name] = material.get("label", name)
	return labels


#============================================
def label_for_material(material_name, material_labels):
	"""Display label for a material; sentinels translated to prose."""
	if material_name == "empty":
		return "nothing"
	if material_name == "mixed":
		return "the mixture"
	return material_labels.get(material_name, material_name or "")


#============================================
def labels_overlap(label_a, label_b):
	"""
	Detect tautology: do these two labels meaningfully overlap?
	Used to drop redundant material phrase when source object label
	already names the material (PBS bottle labeled "PBS", material
	labeled "PBS" -> "from the PBS" without "of PBS").
	"""
	if not label_a or not label_b:
		return False
	a = label_a.lower().strip()
	b = label_b.lower().strip()
	if a == b:
		return True
	if a in b or b in a:
		return True
	a_tokens = re.findall(r"[a-z0-9]+", a)
	b_tokens = re.findall(r"[a-z0-9]+", b)
	if a_tokens and b_tokens and a_tokens[0] == b_tokens[0]:
		return True
	return False


#============================================
def format_volume(value, unit):
	"""Format numeric volume with unit, dropping trailing .0."""
	if value is None:
		return "?"
	try:
		numeric = float(value)
	except (TypeError, ValueError):
		return f"**{value}**"
	unit_str = unit if unit else ""
	# Promote sub-1mL volumes to microliters for readability.
	if unit_str == "ml" and 0 < numeric < 1.0:
		numeric = numeric * 1000
		unit_str = "ul"
	# Format as integer if it's a whole number.
	if numeric == int(numeric):
		value_str = str(int(numeric))
	else:
		value_str = f"{numeric:g}"
	# Convert lowercase ul/ml to Title case.
	if unit_str in ("ul", "ml"):
		unit_str = unit_str[0] + "L"
	if unit_str:
		return f"**{value_str} {unit_str}**"
	return f"**{value_str}**"


#============================================
class StateSimulator:
	"""Track per-object/per-subpart state across a protocol."""

	def __init__(self, catalog):
		"""Initialize empty state map."""
		self.catalog = catalog
		self.state = {}

	#--------------------------------------------
	def get(self, target, field_name):
		"""Return current value, falling back to declared default."""
		object_state = self.state.get(target, {})
		if field_name in object_state:
			return object_state[field_name]
		return self.catalog.default_for_field(target, field_name)

	#--------------------------------------------
	def set(self, target, field_name, value):
		"""Write a new value into the state map."""
		if target not in self.state:
			self.state[target] = {}
		self.state[target][field_name] = value


#============================================
class LintCollector:
	"""
	Collects authoring lint warnings during protocol render. Stores unique
	(step_name, check_class, message) triples and emits them deduplicated
	and sorted to stderr.
	"""

	def __init__(self):
		"""Initialize empty warning set."""
		self.warnings = set()

	#--------------------------------------------
	def record(self, step_name, check_class, message):
		"""Record a lint warning, deduplicating by (step_name, check_class, message)."""
		self.warnings.add((step_name, check_class, message))

	#--------------------------------------------
	def emit(self, stderr_stream):
		"""Print all collected warnings to stderr, sorted by (step_name, check_class, message)."""
		if not self.warnings:
			return
		sorted_warnings = sorted(self.warnings)
		for step_name, check_class, message in sorted_warnings:
			stderr_stream.write(f"{step_name}: {check_class}: {message}\n")


#============================================
def find_state_changes(scene_ops):
	"""Return list of ObjectStateChange ops from a scene_ops list."""
	out = []
	for op in scene_ops or []:
		if op.get("type") == "ObjectStateChange":
			out.append(op)
	return out


#============================================
def find_first_op_of_type(scene_ops, op_type):
	"""Return the first scene_op of the given type, or None."""
	for op in scene_ops or []:
		if op.get("type") == op_type:
			return op
	return None


#============================================
def apply_state_changes(interaction, sim):
	"""Apply every ObjectStateChange in this interaction to the simulator."""
	response = interaction.get("response", {}) or {}
	for op in response.get("scene_operations", []) or []:
		if op.get("type") != "ObjectStateChange":
			continue
		target = op.get("target", "")
		for field, value in (op.get("state", {}) or {}).items():
			sim.set(target, field, value)


#============================================
def is_pipette(catalog, target):
	"""Check whether the object is a pipette by declared kind."""
	return catalog.kind(target) == "pipette"


#============================================
def is_plate_subpart(target):
	"""Check whether target is a dotted subpart reference."""
	return "." in target


#============================================
def _volume_match(vol1, vol2, tolerance=0.01):
	"""
	Check if two volume values match within a tolerance (default 1%).
	Returns True if exact match or if both are within 1% of the larger value.
	"""
	try:
		v1 = float(vol1)
		v2 = float(vol2)
	except (TypeError, ValueError):
		return False
	if v1 == v2:
		return True
	if v1 > 0 and v2 > 0:
		max_val = max(v1, v2)
		pct_diff = abs(v1 - v2) / max_val
		return pct_diff <= tolerance
	return False


#============================================
def render_step(step, catalog, material_labels, sim, touched_objects, lint=None):
	"""
	Render one step. Walks the sequence applying multi-interaction
	grouping where patterns match, with per-step touched-object tracking
	for the verify-vs-pickup fallback heuristic. When lint is not None,
	collects authoring warnings.
	"""
	lines = []
	step_name = step["step_name"]
	prompt = step.get("prompt", "") or ""
	sequence = step.get("sequence", []) or []

	pretty = _first_char_upper(step_name.replace("_", " "))
	lines.append(f"### {pretty}")
	lines.append("")
	lines.append(prompt)
	lines.append("")

	# L-PROMPT: check for click-centric verbs at prompt start.
	if lint is not None:
		tokens = prompt.split()
		if tokens:
			first_token = tokens[0]
			if first_token in ("Click", "Tap", "Press"):
				msg = f"prompt starts with click-centric verb: {first_token!r}"
				lint.record(step_name, "L-PROMPT", msg)

	if not sequence:
		lines.append("*(no interactions)*")
		lines.append("")
		return lines

	prompt_says_verify = any(
		prompt.lower().lstrip().startswith(kw) for kw in VERIFY_PROMPT_KEYWORDS
	)
	step_touched = set()

	index = 0
	seen_sentences = set()
	while index < len(sequence):
		consumed, sentences = render_group_at(
			sequence, index, catalog, material_labels, sim,
			touched_objects, step_touched, prompt_says_verify, step_name, lint,
		)
		for sentence in sentences:
			if sentence not in seen_sentences:
				lines.append(sentence)
				seen_sentences.add(sentence)
		index += consumed

	lines.append("")
	return lines


#============================================
def render_group_at(sequence, index, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify, step_name="", lint=None):
	"""
	Try to match a multi-interaction pattern starting at sequence[index].
	Returns (consumed_count, sentences_list).
	"""
	interaction = sequence[index]
	target = interaction.get("target", "")
	gesture = interaction.get("gesture", "click")

	# Multi-well dispense pattern: pipette aspirate then N consecutive
	# dispenses into related plate wells.
	if gesture == "click" and is_pipette(catalog, target):
		multi = match_multi_well_dispense(sequence, index, catalog)
		if multi is not None:
			consumed, sentence = multi
			for offset in range(consumed):
				_mark_touched(sequence[index + offset], touched_objects, step_touched)
				apply_state_changes(sequence[index + offset], sim)
			return consumed, [sentence]

	# 4-interaction pipette transfer (pickup -> adjust -> source -> dest)
	if gesture == "click" and is_pipette(catalog, target):
		if index + 3 < len(sequence):
			adjust_i = sequence[index + 1]
			source_i = sequence[index + 2]
			dest_i = sequence[index + 3]
			if (
				adjust_i.get("target") == target
				and adjust_i.get("gesture") == "adjust"
				and source_i.get("gesture") == "click"
				and dest_i.get("gesture") == "click"
			):
				sentence = render_pipette_transfer(
					target, adjust_i, source_i, dest_i,
					catalog, material_labels, sim, step_name, lint,
				)

				# F10: Try to absorb consecutive well dispenses into a distribute sentence.
				extra_count = 0
				final_sentence = sentence
				absorb_result = _absorb_consecutive_well_dispenses(
					sequence, index + 4, dest_i, catalog, sim
				)
				if absorb_result is not None:
					extra_count, wells_range, plate_label = absorb_result

					# Compute volume from adjust if available.
					adjust_volume = None
					adjust_unit = ""
					validator = adjust_i.get("validator", {}) or {}
					value = validator.get("value", {}) or {}
					for vol_key in ("held_material_volume", "set_volume"):
						if vol_key in value:
							adjust_volume = value[vol_key]
							adjust_unit = catalog.unit_for_field(target, vol_key)
							break

					if adjust_volume is not None:
						vol_str = format_volume(adjust_volume, adjust_unit)
						final_sentence = (
							f"- Using the {_lower_first(catalog.label(target))}, "
							f"distribute {vol_str} to each of {wells_range} of the "
							f"{plate_label} ({1 + extra_count} wells)."
						)
					else:
						final_sentence = (
							f"- Using the {_lower_first(catalog.label(target))}, "
							f"distribute to each of {wells_range} of the {plate_label} "
							f"({1 + extra_count} wells)."
						)

				# Mark touched and apply state changes for all interactions (base 4 + any extra).
				_mark_touched(interaction, touched_objects, step_touched)
				apply_state_changes(interaction, sim)
				_mark_touched(adjust_i, touched_objects, step_touched)
				apply_state_changes(adjust_i, sim)
				_mark_touched(source_i, touched_objects, step_touched)
				apply_state_changes(source_i, sim)
				_mark_touched(dest_i, touched_objects, step_touched)
				apply_state_changes(dest_i, sim)
				for offset in range(extra_count):
					_mark_touched(sequence[index + 4 + offset], touched_objects, step_touched)
					apply_state_changes(sequence[index + 4 + offset], sim)

				return 4 + extra_count, [final_sentence]

	# 3-interaction pipette transfer (no adjust)
	if gesture == "click" and is_pipette(catalog, target):
		if index + 2 < len(sequence):
			source_i = sequence[index + 1]
			dest_i = sequence[index + 2]
			if (
				source_i.get("gesture") == "click"
				and dest_i.get("gesture") == "click"
				and source_i.get("target") != target
				and dest_i.get("target") != target
				and (source_i.get("response", {}) or {}).get("scene_operations")
				and (dest_i.get("response", {}) or {}).get("scene_operations")
			):
				sentence = render_pipette_transfer(
					target, None, source_i, dest_i,
					catalog, material_labels, sim, step_name, lint,
				)
				for sub in (interaction, source_i, dest_i):
					_mark_touched(sub, touched_objects, step_touched)
					apply_state_changes(sub, sim)
				return 3, [sentence]

	# Aspirate-to-waste pattern: pipette click + click on flask that empties.
	if gesture == "click" and is_pipette(catalog, target):
		if index + 1 < len(sequence):
			next_i = sequence[index + 1]
			next_change = find_first_op_of_type(
				(next_i.get("response", {}) or {}).get("scene_operations"),
				"ObjectStateChange",
			)
			if next_change is not None:
				new_state = next_change.get("state", {}) or {}
				if new_state.get("material_name") == "empty":
					dest_label = catalog.label(next_i.get("target", ""))
					sentence = (
						f"- Use the {_lower_first(catalog.label(target))} "
						f"to aspirate and remove the contents of the {dest_label}."
					)
					for sub in (interaction, next_i):
						_mark_touched(sub, touched_objects, step_touched)
						apply_state_changes(sub, sim)
					return 2, [sentence]

	# No group: single interaction
	sentences = render_single_interaction(
		interaction, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify,
	)
	_mark_touched(interaction, touched_objects, step_touched)
	apply_state_changes(interaction, sim)
	return 1, sentences


#============================================
def _mark_touched(interaction, touched_objects, step_touched):
	"""Record this interaction's target in both touched sets."""
	target = interaction.get("target", "")
	if target:
		touched_objects.add(target)
		step_touched.add(target)


#============================================
def _lower_first(text):
	"""Lowercase only the first character of a label for mid-sentence use."""
	if not text:
		return text
	return text[0].lower() + text[1:]


#============================================
def _first_char_upper(text):
	"""Uppercase only the first character, leaving the rest untouched."""
	if not text:
		return text
	return text[0].upper() + text[1:]


#============================================
def match_multi_well_dispense(sequence, index, catalog):
	"""
	Detect: pipette click + N consecutive clicks on plate wells whose
	material_name and (constant) addition volume match across the run.
	Returns (consumed_count, rendered_sentence) or None.

	Minimum 2 well dispenses required to call it a multi-dispense; only
	groups when all destinations are subparts of the same parent plate
	and all add the same material.
	"""
	if index + 2 >= len(sequence):
		return None
	pipette_i = sequence[index]
	pipette = pipette_i.get("target", "")
	dispenses = []
	cursor = index + 1
	parent_plate = None
	material_name = None
	while cursor < len(sequence):
		dispense_i = sequence[cursor]
		if dispense_i.get("gesture") != "click":
			break
		dest = dispense_i.get("target", "")
		if not is_plate_subpart(dest):
			break
		parent = dest.split(".", 1)[0]
		if parent_plate is None:
			parent_plate = parent
		elif parent != parent_plate:
			break
		change = find_first_op_of_type(
			(dispense_i.get("response", {}) or {}).get("scene_operations"),
			"ObjectStateChange",
		)
		if change is None:
			break
		state = change.get("state", {}) or {}
		if "material_name" not in state:
			break
		if material_name is None:
			material_name = state["material_name"]
		elif state["material_name"] != material_name:
			break
		dispenses.append(dest.split(".", 1)[1])
		cursor += 1
	if len(dispenses) < 2:
		return None
	add_vol = None
	add_unit = ""
	# Backward iteration with first-match break: earliest matching adjust in the
	# 4-interaction window wins.
	for check_index in range(max(0, index - 4), index):
		prior = sequence[check_index]
		if prior.get("gesture") == "adjust" and prior.get("target") == pipette:
			value = (prior.get("validator", {}) or {}).get("value", {}) or {}
			for key in ("held_material_volume", "set_volume"):
				if key in value:
					add_vol = value[key]
					add_unit = catalog.unit_for_field(pipette, key)
					break
			if add_vol is not None:
				break
	wells_range = _summarize_well_list(dispenses)
	plate_label = catalog.label(parent_plate)
	if add_vol is not None:
		vol_str = format_volume(add_vol, add_unit)
		sentence = (
			f"- Dispense {vol_str} into each of {wells_range} of the "
			f"{plate_label} ({len(dispenses)} wells)."
		)
	else:
		sentence = (
			f"- Dispense into each of {wells_range} of the {plate_label} "
			f"({len(dispenses)} wells)."
		)
	consumed = 1 + len(dispenses)
	return consumed, sentence


#============================================
def _summarize_well_list(wells):
	"""
	Render a contiguous well list as a range ("B1-B12") or a comma list
	if discontiguous. Groups by row letter.
	"""
	if not wells:
		return ""
	by_row = {}
	for well in wells:
		match = re.match(r"^([A-H])(\d+)$", well)
		if match is None:
			by_row.setdefault("_other", []).append(well)
			continue
		row, col = match.group(1), int(match.group(2))
		by_row.setdefault(row, []).append(col)
	row_strs = []
	for row, cols in by_row.items():
		if row == "_other":
			row_strs.extend(by_row["_other"])
			continue
		cols_sorted = sorted(cols)
		if cols_sorted == list(range(cols_sorted[0], cols_sorted[-1] + 1)):
			row_strs.append(f"wells {row}{cols_sorted[0]}-{row}{cols_sorted[-1]}")
		else:
			row_strs.append(", ".join(f"{row}{c}" for c in cols_sorted))
	return " + ".join(row_strs)


#============================================
def _absorb_consecutive_well_dispenses(sequence, index_after_transfer, dest_i,
		catalog, sim):
	"""
	Detect and absorb consecutive plate-subpart dispenses with matching
	material and volume deltas into a multi-well distribute sentence.
	Returns (extra_count, distribute_sentence) or None if no absorption.

	Called from the 4-interaction pipette transfer branch to check whether
	the destination is a plate subpart and whether subsequent interactions
	are consecutive well dispenses with matching material and volume.
	Intent: collapse "dispense to well A1, A2, A3..." into one sentence
	covering all wells when the volume and material are constant.
	"""
	dest_target = dest_i.get("target", "")
	if not is_plate_subpart(dest_target):
		return None

	dest_parent = dest_target.split(".", 1)[0]
	dest_change = find_first_op_of_type(
		(dest_i.get("response", {}) or {}).get("scene_operations"),
		"ObjectStateChange",
	)
	if dest_change is None:
		return None

	dest_state = dest_change.get("state", {}) or {}
	dest_material = dest_state.get("material_name")
	dest_volume_delta = dest_state.get("material_volume")

	# Peek ahead for consecutive well clicks with same parent, material, volume.
	extra_wells = []
	cursor = index_after_transfer
	while cursor < len(sequence):
		cont_i = sequence[cursor]
		if cont_i.get("gesture") != "click":
			break
		cont_target = cont_i.get("target", "")
		if not is_plate_subpart(cont_target):
			break
		cont_parent = cont_target.split(".", 1)[0]
		if cont_parent != dest_parent:
			break
		cont_change = find_first_op_of_type(
			(cont_i.get("response", {}) or {}).get("scene_operations"),
			"ObjectStateChange",
		)
		if cont_change is None:
			break
		cont_state = cont_change.get("state", {}) or {}
		cont_material = cont_state.get("material_name")
		cont_volume = cont_state.get("material_volume")

		# Check material match and volume match
		if cont_material != dest_material:
			break
		if not _volume_match(dest_volume_delta, cont_volume):
			break

		extra_wells.append(cont_target.split(".", 1)[1])
		cursor += 1

	if not extra_wells:
		return None

	all_wells = [dest_target.split(".", 1)[1]] + extra_wells
	wells_range = _summarize_well_list(all_wells)
	plate_label = catalog.label(dest_parent)
	return len(extra_wells), wells_range, plate_label


#============================================
def render_pipette_transfer(pipette_name, adjust_i, source_i, dest_i,
		catalog, material_labels, sim, step_name="", lint=None):
	"""
	Render one combined sentence for a pipette transfer. Resolves volume
	in priority: adjust value -> source delta -> dest delta. Resolves
	material in priority: source's tracked material_name -> dest's new
	material_name. Suppresses redundant material phrase when source label
	already overlaps with material label. When lint is not None, collects
	authoring warnings about material drift and volume mismatches.
	"""
	pipette_label = catalog.label(pipette_name)
	source_name = source_i.get("target", "")
	dest_name = dest_i.get("target", "")
	source_label = catalog.label(source_name)
	dest_label = catalog.label(dest_name)

	volume = None
	unit = ""
	adjust_volume = None
	adjust_unit = ""

	if adjust_i is not None:
		validator = adjust_i.get("validator", {}) or {}
		value = validator.get("value", {}) or {}
		for vol_key in ("held_material_volume", "set_volume"):
			if vol_key in value:
				volume = value[vol_key]
				adjust_volume = volume
				unit = catalog.unit_for_field(pipette_name, vol_key)
				adjust_unit = unit
				break

	source_change = find_first_op_of_type(
		(source_i.get("response", {}) or {}).get("scene_operations"),
		"ObjectStateChange",
	)
	dest_change = find_first_op_of_type(
		(dest_i.get("response", {}) or {}).get("scene_operations"),
		"ObjectStateChange",
	)

	if volume is None and source_change is not None:
		new_state = source_change.get("state", {}) or {}
		# When the source-click writes held_material_volume to the pipette
		# itself, that IS the per-aspirate loaded volume; use it directly
		# instead of computing a delta. This matches the case where the
		# pipette's loaded state is the authored signal for the dispense
		# size, and avoids falling through to dest_delta (which would
		# return the well-total under Q5 well-total state-field semantics).
		if "held_material_volume" in new_state:
			volume = new_state["held_material_volume"]
			unit = catalog.unit_for_field(
				source_change.get("target"), "held_material_volume"
			)
		elif "material_volume" in new_state:
			old = sim.get(source_change.get("target"), "material_volume")
			try:
				delta = float(old) - float(new_state["material_volume"])
				if delta > 0:
					volume = delta
					unit = catalog.unit_for_field(
						source_change.get("target"), "material_volume"
					)
			except (TypeError, ValueError):
				pass

	dest_delta = None
	dest_delta_unit = ""
	if volume is None and dest_change is not None:
		new_state = dest_change.get("state", {}) or {}
		if "material_volume" in new_state:
			old = sim.get(dest_change.get("target"), "material_volume")
			try:
				old_val = float(old) if old is not None else 0.0
				delta = float(new_state["material_volume"]) - old_val
			except (TypeError, ValueError):
				pass
			else:
				if delta > 0:
					volume = delta
					dest_delta = delta
					dest_delta_unit = catalog.unit_for_field(
						dest_change.get("target"), "material_volume"
					)
					unit = dest_delta_unit
	elif dest_change is not None:
		# Compute dest_delta even when volume is already known, for use in
		# L-VOLMISMATCH lint check below to verify adjust matches the destination
		# volume change.
		new_state = dest_change.get("state", {}) or {}
		if "material_volume" in new_state:
			old = sim.get(dest_change.get("target"), "material_volume")
			try:
				old_val = float(old) if old is not None else 0.0
				delta = float(new_state["material_volume"]) - old_val
			except (TypeError, ValueError):
				pass
			else:
				if delta > 0:
					dest_delta = delta
					dest_delta_unit = catalog.unit_for_field(
						dest_change.get("target"), "material_volume"
					)

	# L-VOLMISMATCH: check if adjust value and dest delta mismatch by > 1%.
	# When units differ (e.g., uL vs mL), convert both to uL for comparison.
	# Suppress this check for plate subparts (dotted notation) where multi-well
	# aggregation can cause false positives (e.g., 100 uL per well x 96 wells = 9600 uL).
	if lint is not None and adjust_volume is not None and dest_delta is not None:
		if "." not in dest_name:
			try:
				adjust_val = float(adjust_volume)
				dest_val = float(dest_delta)
			except (TypeError, ValueError):
				pass
			else:
				if adjust_val > 0 and dest_val > 0:
					# Normalize both to uL for unit-agnostic comparison.
					adjust_ul = adjust_val * (1000 if adjust_unit == "ml" else 1)
					dest_ul = dest_val * (1000 if dest_delta_unit == "ml" else 1)
					max_val = max(adjust_ul, dest_ul)
					pct_diff = abs(adjust_ul - dest_ul) / max_val
					if pct_diff > 0.01:
						lint.record(
							step_name, "L-VOLMISMATCH",
							f"pipette set to {adjust_val} {adjust_unit}, dest delta is {dest_val} {dest_delta_unit}"
						)

	material_name = sim.get(source_name, "material_name")
	if not material_name or material_name == "empty":
		material_name = None

	# L-MATDRIFT: check if source material is undefined/empty.
	if lint is not None and not material_name:
		if dest_change is not None:
			dest_state = dest_change.get("state", {}) or {}
			dest_material = dest_state.get("material_name")
			if dest_material:
				lint.record(
					step_name, "L-MATDRIFT",
					f"source material undefined; dest material {dest_material!r} assumed by author"
				)

	material_label = label_for_material(material_name or "", material_labels) if material_name else ""

	# Verb choice: "draw" for pipette loading FROM a source; "aspirate" is
	# reserved for vacuum-removal-to-waste (handled in the aspirate-to-waste
	# pattern elsewhere). Lab convention: "aspirate" implies a vacuum line
	# pulling content to waste, not a pipette drawing reagent for transfer.
	parts = [f"- Using the {_lower_first(pipette_label)},"]
	if volume is not None:
		parts.append("draw")
		parts.append(format_volume(volume, unit))
		if material_name and material_name != "empty":
			if not labels_overlap(source_label, material_label):
				parts.append(f"of {material_label}")
		parts.append(f"from the {source_label}")
		parts.append(f"and dispense into the {dest_label}.")
	else:
		parts.append("transfer")
		if material_name and material_name != "empty":
			if not labels_overlap(source_label, material_label):
				parts.append(material_label)
		parts.append(f"from the {source_label}")
		parts.append(f"into the {dest_label}.")
	return " ".join(parts)


#============================================
#============================================
def _field_to_human_phrase(field_name, new_value, catalog=None, target=None):
	"""
	Translate field-name-and-value pairs to imperative student-facing prose.
	Returns a phrase fragment like "is now empty" or "is now powered on".
	For unknown fields, returns None (fallback to generic template).

	When catalog and target are provided, uses format_volume for volume fields
	and resolves units from object state_fields.
	"""
	value_str = str(new_value).replace("_", " ").lower()
	if field_name == "material_name":
		if new_value == "empty":
			return "is now empty"
		return f"now contains {value_str}"
	if field_name == "held_material_name":
		if new_value == "empty":
			return "is now empty"
		return f"now holds {value_str}"
	if field_name == "material_volume":
		if catalog and target:
			unit = catalog.unit_for_field(target, field_name)
			# Detect and fix unit-conversion mismatch: if value is suspiciously small
			# (< 1.0) and unit is "ul", assume it was stored in mL and promote it.
			try:
				numeric = float(new_value)
				if unit == "ul" and 0 < numeric < 1.0:
					# Assume this is actually in mL; convert to uL for display.
					unit = "ml"
			except (TypeError, ValueError):
				pass
			return f"contains {format_volume(new_value, unit)}"
		return f"contains {value_str}"
	if field_name == "held_material_volume":
		if catalog and target:
			unit = catalog.unit_for_field(target, field_name)
			# Detect and fix unit-conversion mismatch: if value is suspiciously small
			# (< 1.0) and unit is "ul", assume it was stored in mL and promote it.
			try:
				numeric = float(new_value)
				if unit == "ul" and 0 < numeric < 1.0:
					# Assume this is actually in mL; convert to uL for display.
					unit = "ml"
			except (TypeError, ValueError):
				pass
			return f"holds {format_volume(new_value, unit)}"
		return f"holds {value_str}"
	if field_name == "tape_present":
		return "tape removed" if new_value is False else "tape applied"
	if field_name == "running":
		return "is now started" if new_value is True else "is now stopped"
	if field_name == "lid_open":
		return "is now open" if new_value is True else "is now closed"
	if field_name == "powered_on":
		return "is now powered on" if new_value is True else "is now powered off"
	if field_name == "image_captured":
		return "has captured an image" if new_value is True else "has not captured an image"
	if field_name == "cathode_lead_attached":
		return "cathode lead attached" if new_value is True else "cathode lead detached"
	if field_name == "anode_lead_attached":
		return "anode lead attached" if new_value is True else "anode lead detached"
	if field_name == "side_clamps_locked":
		return "side clamps locked" if new_value is True else "side clamps unlocked"
	if field_name == "wing_clamps_locked":
		return "wing clamps locked" if new_value is True else "wing clamps unlocked"
	if field_name == "wing_clamps_open":
		return "wing clamps open" if new_value is True else "wing clamps closed"
	if field_name == "comb_present":
		return "comb in place" if new_value is True else "comb removed"
	if field_name == "top_plate_inserted":
		return "top plate inserted" if new_value is True else "top plate removed"
	if field_name == "glass_plate_inserted":
		return "glass plate inserted" if new_value is True else "glass plate removed"
	if field_name == "mounted":
		return "mounted" if new_value is True else "unmounted"
	if field_name == "cassette_mounted":
		return "cassette mounted" if new_value is True else "cassette removed"
	if field_name == "module_present":
		return "module installed" if new_value is True else "module removed"
	if field_name == "kimwipes_present":
		return "kimwipes added" if new_value is True else "kimwipes removed"
	if field_name == "gel_present":
		return "gel placed" if new_value is True else "gel removed"
	if field_name == "sealed":
		return "sealed" if new_value is True else "opened"
	if field_name == "tray_present":
		return "tray placed" if new_value is True else "tray removed"
	if field_name == "rack_present":
		return "rack placed" if new_value is True else "rack removed"
	if field_name == "door_open":
		return "door open" if new_value is True else "door closed"
	if field_name == "lid_present":
		return "lid placed" if new_value is True else "lid removed"

	# Handle subpart-prefixed material fields (e.g., inner_chamber_material_name,
	# outer_chamber_material_volume). Extract subpart name and produce natural prose.
	# Note: subpart label gets capitalized because the caller wraps it as
	# "The {target_label} {phrase}." so we need to lowercase the subpart part.
	if field_name.endswith("_material_name"):
		subpart = field_name[:-len("_material_name")]
		subpart_label = subpart.replace("_", " ")
		if new_value == "empty":
			return f"{subpart_label} is now empty"
		material_label = str(new_value).replace("_", " ").lower()
		return f"{subpart_label} now contains {material_label}"

	if field_name.endswith("_material_volume"):
		subpart = field_name[:-len("_material_volume")]
		subpart_label = subpart.replace("_", " ")
		if catalog and target:
			unit = catalog.unit_for_field(target, field_name)
			# Detect and fix unit-conversion mismatch: if value is suspiciously small
			# (< 1.0) and unit is "ul", assume it was stored in mL and promote it.
			try:
				numeric = float(new_value)
				if unit == "ul" and 0 < numeric < 1.0:
					# Assume this is actually in mL; convert to uL for display.
					unit = "ml"
			except (TypeError, ValueError):
				pass
			return f"{subpart_label} holds {format_volume(new_value, unit)}"
		return f"{subpart_label} holds {value_str}"

	return None


#============================================
def render_single_interaction(interaction, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify):
	"""Render one ungrouped interaction. Returns a list of sentences."""
	gesture = interaction.get("gesture", "click")
	target = interaction.get("target", "")
	target_label = catalog.label(target)
	response = interaction.get("response", {}) or {}
	scene_ops = response.get("scene_operations", []) or []

	bullets = []

	# TimedWait
	for op in scene_ops:
		if op.get("type") == "TimedWait":
			minutes = op.get("duration_min", "?")
			display = op.get("display", "") or ""
			seconds = None
			try:
				numeric = float(minutes)
				if 0 < numeric < 1:
					seconds = int(round(numeric * 60))
			except (TypeError, ValueError):
				pass
			wait = f"**{seconds} sec**" if seconds is not None else f"**{minutes} min**"
			if display:
				bullets.append(f"- Wait {wait} ({display}).")
			else:
				bullets.append(f"- Wait {wait}.")

	# SceneChange
	for op in scene_ops:
		if op.get("type") == "SceneChange":
			to_scene = op.get("to_scene", "").replace("_", " ")
			bullets.append(f"- Move to the **{to_scene}**.")

	# adjust gesture
	if gesture == "adjust":
		validator = interaction.get("validator", {}) or {}
		value = validator.get("value", {}) or {}
		# Map known keys to display labels.
		field_map = {
			"held_material_volume": "volume",
			"set_volume": "volume",
			"set_temperature": "temperature",
			"set_rpm": "speed",
			"set_time_s": "timer",
			"set_time_min": "timer",
		}
		# Check if value is a dict with exactly one key.
		if isinstance(value, dict) and len(value) == 1:
			key = list(value.keys())[0]
			# Use hardcoded map if key is in it, else derive from key name.
			if key in field_map:
				field_label = field_map[key]
			elif key.startswith("set_") or key == "held_material_volume":
				# Derive label from key: set_temperature -> temperature.
				prefix_to_strip = "set_" if key.startswith("set_") else "held_material_"
				field_label = key[len(prefix_to_strip):].replace("_", " ")
			else:
				field_label = key.replace("_", " ")
			unit = catalog.unit_for_field(target, key)
			bullets.append(
				f"- Set the {_lower_first(target_label)} {field_label} "
				f"to {format_volume(value[key], unit)}."
			)
			return bullets
		bullets.append(f"- Adjust the {_lower_first(target_label)}.")
		return bullets

	state_changes = find_state_changes(scene_ops)

	# Indirect cause-effect: click on X mutates Y (Y != X).
	for change in state_changes:
		change_target = change.get("target", "")
		if change_target and change_target != target:
			new_state = change.get("state", {}) or {}
			field, value = next(iter(new_state.items()))
			change_label = catalog.label(change_target)
			if "cleanliness" in field and "ethanol" in str(value):
				bullets.append(
					f"- Use the {_lower_first(target_label)} to spray and "
					f"sterilize the {change_label}."
				)
				return bullets
			# Use humanized field names for better readability.
			human_phrase = _field_to_human_phrase(field, value, catalog, change_target)
			if human_phrase:
				bullets.append(
					f"- Use the {_lower_first(target_label)} to update the "
					f"{change_label} ({human_phrase})."
				)
				return bullets
			pretty_field = field.replace("_", " ")
			pretty_value = str(value).replace("_", " ")
			bullets.append(
				f"- Use the {_lower_first(target_label)} to update the "
				f"{change_label} ({pretty_field}: {pretty_value})."
			)
			return bullets

	# State changes on the click target. Render each state change as a bullet.
	found_target_change = False
	for change in state_changes:
		if change.get("target") != target:
			continue
		found_target_change = True
		new_state = change.get("state", {}) or {}
		if "material_name" in new_state:
			new_material = new_state["material_name"]
			if new_material == "empty":
				bullets.append(f"- Aspirate and remove the contents of the {target_label}.")
				continue
			material_label = label_for_material(new_material, material_labels)
			volume = new_state.get("material_volume")
			if volume is not None:
				old_vol = sim.get(target, "material_volume")
				try:
					old_val = float(old_vol) if old_vol is not None else 0.0
					delta = float(volume) - old_val
					if delta > 0:
						unit = catalog.unit_for_field(target, "material_volume")
						# F5 extension: suppress material name when dest is a plate subpart,
						# old state is empty, and source cannot be inferred from this interaction.
						if is_plate_subpart(target) and old_val == 0.0:
							bullets.append(
								f"- Add {format_volume(delta, unit)} to the {target_label}."
							)
							continue
						bullets.append(
							f"- Add {format_volume(delta, unit)} of "
							f"{material_label} to the {target_label}."
						)
						continue
				except (TypeError, ValueError):
					pass
				unit = catalog.unit_for_field(target, "material_volume")
				bullets.append(
					f"- The {target_label} now contains "
					f"{format_volume(volume, unit)} of {material_label}."
				)
				continue
			bullets.append(f"- The {target_label} now contains {material_label}.")
			continue

		if "material_volume" in new_state and "material_name" not in new_state:
			old_vol = sim.get(target, "material_volume")
			new_vol = new_state["material_volume"]
			try:
				old_val = float(old_vol) if old_vol is not None else 0.0
				delta = old_val - float(new_vol)
				if delta > 0:
					unit = catalog.unit_for_field(target, "material_volume")
					bullets.append(
						f"- Draw {format_volume(delta, unit)} from the {target_label}."
					)
					continue
			except (TypeError, ValueError):
				pass
			bullets.append(f"- Draw from the {target_label}.")
			continue

		# Other state field (status, cleanliness, boolean flags).
		field, value = next(iter(new_state.items()))
		human_phrase = _field_to_human_phrase(field, value, catalog, target)
		if human_phrase:
			bullets.append(f"- The {target_label} {human_phrase}.")
			continue
		# Fallback for unmapped fields: humanize without asterisks.
		pretty_field = field.replace("_", " ")
		if isinstance(value, bool):
			if value:
				bullets.append(f"- The {target_label} is now {pretty_field}.")
			else:
				bullets.append(f"- The {target_label} is no longer {pretty_field}.")
		else:
			pretty_value = str(value).replace("_", " ")
			bullets.append(f"- The {target_label} {pretty_field} is now {pretty_value}.")

	if found_target_change and bullets:
		return bullets

	# Bare CursorAttach only -> pickup.
	for op in scene_ops:
		if op.get("type") == "CursorAttach":
			bullets.append(f"- Pick up the {target_label}.")
			return bullets

	# Bare click with no scene_ops: verify or pickup.
	if gesture == "click" and not scene_ops:
		if prompt_says_verify:
			bullets.append(f"- Verify the {target_label}.")
		elif target in touched_objects and target not in step_touched:
			bullets.append(f"- Verify the {target_label}.")
		else:
			bullets.append(f"- Pick up the {target_label}.")
		return bullets

	if bullets:
		return bullets

	return [f"- Interact with the {target_label}."]


#============================================
def render_learning_block(learning):
	"""Render the learning block."""
	lines = ["## Learning", ""]
	objectives = learning.get("objectives", "") or ""
	outcomes = learning.get("outcomes", "") or ""
	goals = learning.get("goals", "") or ""
	if objectives:
		lines.append(f"**Objectives.** {objectives}")
		lines.append("")
	if outcomes:
		lines.append(f"**Outcomes.** {outcomes}")
		lines.append("")
	if goals:
		lines.append(f"**Goals.** {goals}")
		lines.append("")
	return lines


#============================================
def prewalk_touched_objects(protocol, catalog):
	"""
	Walk the protocol step chain (entry_step + next_step) and collect all
	interaction targets. Returns a set of object names (parent only, no subparts).
	Kind filtering to purchasable objects happens in render_equipment_section.
	"""
	touched = set()
	steps_by_name = {}
	for step in protocol.get("steps", []) or []:
		steps_by_name[step["step_name"]] = step
	current_name = protocol.get("entry_step")
	visited = set()
	while current_name is not None:
		if current_name in visited:
			break
		visited.add(current_name)
		step = steps_by_name.get(current_name)
		if step is None:
			break
		for interaction in step.get("sequence", []) or []:
			target = interaction.get("target", "")
			if target:
				# Extract parent name (before the dot if it's a subpart).
				parent = target.split(".", 1)[0]
				touched.add(parent)
		current_name = step.get("next_step")
	return touched


#============================================
def collect_referenced_materials(protocol):
	"""
	Walk the protocol's interactions and scene_operations to collect all
	material_name and held_material_name values actually referenced.
	Returns a set of material names.
	"""
	referenced = set()
	steps_by_name = {}
	for step in protocol.get("steps", []) or []:
		steps_by_name[step["step_name"]] = step
	current_name = protocol.get("entry_step")
	visited = set()
	while current_name is not None:
		if current_name in visited:
			break
		visited.add(current_name)
		step = steps_by_name.get(current_name)
		if step is None:
			break
		for interaction in step.get("sequence", []) or []:
			response = interaction.get("response", {}) or {}
			for op in response.get("scene_operations", []) or []:
				if op.get("type") == "ObjectStateChange":
					state = op.get("state", {}) or {}
					for material_field in ("material_name", "held_material_name"):
						if material_field in state:
							mat = state[material_field]
							if mat:
								referenced.add(mat)
		current_name = step.get("next_step")
	return referenced


#============================================
def render_materials_section(material_labels, protocol=None):
	"""
	Render the ## Materials section. Emits nothing if material_labels is empty.
	When protocol is provided, filter material_labels to only those referenced
	in the protocol's interactions. Returns list of markdown lines.
	"""
	if not material_labels:
		return []
	labels_to_render = material_labels
	if protocol is not None:
		referenced = collect_referenced_materials(protocol)
		labels_to_render = {
			k: v for k, v in material_labels.items() if k in referenced
		}
	if not labels_to_render:
		return []
	lines = ["## Materials", ""]
	for label in sorted(labels_to_render.values()):
		lines.append(f"- {label}")
	lines.append("")
	return lines


#============================================
def render_equipment_section(touched_objects, catalog):
	"""
	Render the ## Equipment section. Emits nothing if touched_objects is empty.
	Filters to only objects with kinds in the purchasable set.
	Returns list of markdown lines.
	"""
	# Kinds that a student would shop for on a bench setup list. Object schema
	# kinds outside this set (scene-change targets, abstract slots, UI helpers)
	# are excluded from the equipment header. Update when content/objects/ adds a
	# new shoppable kind.
	purchasable_kinds = {"pipette", "bottle", "tube", "plate", "rack", "flask", "instrument", "container", "vial"}
	filtered = []
	for obj_name in sorted(touched_objects):
		kind = catalog.kind(obj_name)
		if kind in purchasable_kinds:
			label = catalog.label(obj_name)
			filtered.append(label)
	if not filtered:
		return []
	lines = ["## Equipment", ""]
	for label in sorted(set(filtered)):
		lines.append(f"- {label}")
	lines.append("")
	return lines


#============================================
def render_protocol_manual(protocol_name, catalog, lint=None):
	"""
	Render a mini-protocol or sequence runner; return markdown string.
	When lint is not None, collects authoring warnings in the collector.
	"""
	protocol_path = os.path.join(toolkit_paths.PROTOCOLS_DIR, protocol_name, "protocol.yaml")
	protocol = load_yaml(protocol_path)
	protocol_type = protocol.get("protocol_type", "mini_protocol")

	lines = [f"# {protocol_type.replace('_', '-')}: {protocol_name.replace('_', ' ')}", ""]

	learning = protocol.get("learning", {}) or {}
	if learning:
		lines.extend(render_learning_block(learning))

	if protocol_type == "sequence_runner":
		constituents = protocol.get("mini_protocols", []) or []
		lines.append("## Constituent mini-protocols")
		lines.append("")
		for name in constituents:
			lines.append(f"- {name.replace('_', ' ')}")
		lines.append("")
		for iteration_num, name in enumerate(constituents, start=1):
			lines.append("---")
			lines.append("")
			iteration_header = f"### Iteration {iteration_num} of {len(constituents)}: {name.replace('_', ' ')}"
			lines.append(iteration_header)
			lines.append("")
			child_md = render_protocol_manual(name, catalog, lint)
			if child_md.startswith("# "):
				child_md = "## " + child_md[2:]
			lines.append(child_md)
		return "\n".join(lines)

	material_labels = load_material_labels(protocol_name)
	sim = StateSimulator(catalog)
	equipment_set = prewalk_touched_objects(protocol, catalog)

	steps_by_name = {}
	for step in protocol.get("steps", []) or []:
		steps_by_name[step["step_name"]] = step

	# Render materials and equipment sections between learning and procedure.
	lines.extend(render_materials_section(material_labels, protocol))
	lines.extend(render_equipment_section(equipment_set, catalog))

	lines.append("## Procedure")
	lines.append("")

	step_number = 1
	current_name = protocol.get("entry_step")
	visited = set()
	touched_objects = set()
	while current_name is not None:
		if current_name in visited:
			lines.append(f"*(cycle detected at {current_name}; halting render)*")
			break
		visited.add(current_name)
		step = steps_by_name.get(current_name)
		if step is None:
			lines.append(f"*(broken next_step reference: {current_name})*")
			break
		step_lines = render_step(
			step, catalog, material_labels, sim, touched_objects, lint,
		)
		step_lines[0] = step_lines[0].replace("### ", f"### Step {step_number}. ")
		lines.extend(step_lines)
		step_number += 1
		current_name = step.get("next_step")

	return "\n".join(lines)


#============================================
def write_manual(name, markdown, out_dir):
	"""
	Write one rendered manual to <out_dir>/<name>.md and return the path.

	Creates out_dir if missing. The output filename always uses the
	canonical protocol name so a bulk run and a single run produce the
	same filename for the same protocol.
	"""
	os.makedirs(out_dir, exist_ok=True)
	out_path = os.path.join(out_dir, f"{name}.md")
	with open(out_path, "w", encoding="utf-8") as handle:
		handle.write(markdown)
		handle.write("\n")
	return out_path


#============================================
def parse_args():
	"""Parse command-line arguments."""
	#============================================
	# extras callback registers protocol_manual-specific flags.
	# Note: shared CLI already provides -p/--protocol, -i/--interactive,
	# -l/--list, and -q/--quiet. We only add manual-specific flags here.
	#============================================
	def register_manual_flags(parser):
		selection_group = parser.add_argument_group("Manual Selection")
		selection_group.add_argument(
			"protocol", nargs="?",
			help="Protocol name or path to render (single-protocol mode). "
				"Positional argument; also see -p/--protocol from shared CLI.",
		)
		selection_group.add_argument(
			"-a", "--all", dest="render_all", action="store_true",
			help=f"Render every shipped protocol to {DEFAULT_BULK_OUT_DIR}/.",
		)
		selection_group.add_argument(
			"--list-protocols",
			dest="list_protocols_flag", action="store_true",
			help="List available protocols (alternative to shared -l/--list).",
		)

		output_group = parser.add_argument_group("Manual Output")
		output_group.add_argument(
			"--out-dir", dest="out_dir", default=None,
			help=(
				"Output directory. Default: CWD for single, "
				f"{DEFAULT_BULK_OUT_DIR}/ for --all."
			),
		)
		output_group.add_argument(
			"--stdout", dest="to_stdout", action="store_true",
			help="Print rendered markdown to stdout instead of writing a file.",
		)

		lint_group = parser.add_argument_group("Lint")
		lint_group.add_argument(
			"--lint", dest="lint", action="store_true",
			help="Emit authoring lint warnings to stderr (does not alter rendered output).",
		)

	parser = toolkit_cli.build_parser(
		prog='render',
		description=(
			'Render mini-protocol YAML to a human-readable lab manual. '
			'Single mode writes ./<name>.md to the current directory; '
			'--all writes to ./output_manuals/.'
		),
		extras=register_manual_flags
	)

	args = parser.parse_args()

	#============================================
	# Protocol manual does not support JSON output (renderer emits markdown).
	# Reject if user passes --json or --ndjson.
	#============================================
	if args.output_format != 'text':
		toolkit_reporter.print_error(
			'Format not supported: render renders markdown only. '
			'(--json and --ndjson do not apply to rendered manuals.)'
		)
		sys.exit(2)

	#============================================
	# Map shared CLI args (protocols) to protocol_manual internal name (protocol_names).
	#============================================
	args.protocol_names = args.protocols

	return args


#============================================
def _collect_selection(args):
	"""
	Resolve CLI flags to (list_of_protocol_names, is_bulk).

	Returns (None, _) if nothing was selected (caller prints help and exits).
	Resolves name-or-path inputs to canonical protocol names.
	"""
	# --all: every shipped protocol
	if args.render_all:
		return toolkit_protocols.list_protocols(), True

	# --interactive: numbered menu
	if args.interactive:
		names = toolkit_protocols.list_protocols()
		selected = toolkit_interactive.pick_protocol_interactively(names)
		if selected is None:
			return None, False
		return [selected], False

	# -p / --protocol (multi) OR positional (single)
	raw_inputs = []
	if args.protocol_names:
		raw_inputs.extend(args.protocol_names)
	if args.protocol:
		raw_inputs.append(args.protocol)
	if not raw_inputs:
		return None, False

	resolved = []
	for name_or_path in raw_inputs:
		path = toolkit_protocols.resolve_protocol_path(name_or_path)
		if path is None:
			toolkit_reporter.print_error(f"Protocol '{name_or_path}' not found.")
			return None, False
		resolved.append(toolkit_protocols.protocol_name_from_path(path))
	return resolved, False


#============================================
def main():
	"""Dispatch by selection mode; write or print rendered manuals.

	# Verbosity contract (text output line targets):
	#   -q / --quiet   : 1 line (final pass/fail with key numbers)
	#   default        : 5-40 lines (stage summary, totals, top categories)
	#   -v / --verbose : 40-<200 lines (per-content-file breakdown, grouped, summarized)
	#   -j / --json    : full machine-readable detail (no bound)
	#   -J / --ndjson  : streamed full detail (no bound)
	# Raw per-step / per-asset internals go to JSON only, NOT text.
	# Manual renderer note: primary output is the rendered markdown file;
	# -j/-J reject (this tool emits markdown, not findings).
	"""
	args = parse_args()

	# --list-protocols is a fast filesystem operation.
	# Note: shared CLI also provides --list, but protocol_manual uses
	# --list-protocols specifically. --list is ignored for this tool.
	if args.list_protocols_flag:
		for name in toolkit_protocols.list_protocols():
			print(name)
		sys.exit(0)

	names, is_bulk = _collect_selection(args)
	if names is None:
		toolkit_reporter.print_error(
			"pass a <protocol> name, --protocol NAME..., --interactive, or --all."
		)
		sys.exit(2)

	catalog = ObjectCatalog()

	# Choose output sink. --stdout overrides everything; otherwise pick a
	# directory. Bulk defaults to output_manuals/; single defaults to CWD.
	if args.to_stdout:
		for name in names:
			if not args.quiet:
				toolkit_reporter.print_section_header(name)
			lint = LintCollector() if args.lint else None
			md = render_protocol_manual(name, catalog, lint)
			print(md)
			if lint is not None:
				lint.emit(sys.stderr)
		sys.exit(0)

	if args.out_dir is not None:
		out_dir = args.out_dir
	elif is_bulk:
		out_dir = DEFAULT_BULK_OUT_DIR
	else:
		out_dir = "."

	failures = 0
	for name in names:
		if not args.quiet:
			toolkit_reporter.print_section_header(f"Rendering {name}")
		lint = LintCollector() if args.lint else None
		md = render_protocol_manual(name, catalog, lint)
		out_path = write_manual(name, md, out_dir)
		if not args.quiet:
			toolkit_reporter.print_pass(out_path)
		if lint is not None:
			lint.emit(sys.stderr)

	if not args.quiet:
		toolkit_reporter.print_summary_line(
			len(names), failures, item_label="manuals",
		)

	sys.exit(0)


if __name__ == "__main__":
	main()
