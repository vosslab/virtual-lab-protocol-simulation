#!/usr/bin/env python3
"""
Render a mini-protocol YAML to a human-readable lab manual.

Third gate after `tools/validate_content_yaml.py` (syntax) and
`tools/protocol_stepper.py` (semantic flow). This tool renders the
authored YAML to markdown prose so a pedagogy reviewer can read every
mini end-to-end without parsing YAML. Reading prose surfaces a bug
class that neither static validation nor flow simulation can catch:
click-centric prompts, action-vs-end-state divergence, material
identity drift, inverted cause-effect modeling, and over-atomization
of steps.

Usage:
	source source_me.sh && python3 tools/protocol_manual.py <protocol_name>
	source source_me.sh && python3 tools/protocol_manual.py -p NAME [NAME ...]
	source source_me.sh && python3 tools/protocol_manual.py --interactive
	source source_me.sh && python3 tools/protocol_manual.py --list-protocols
	source source_me.sh && python3 tools/protocol_manual.py --all

Single mode writes `./<protocol_name>.md` to the current working
directory. `--all` writes every protocol to `./output_manuals/`.
Override the directory with `--out <dir>`, or use `--stdout` to print
the rendered markdown to stdout instead of writing files.

Reuses no validator or stepper code; reads YAML directly via pyyaml.
Translation templates are heuristic and live in this file. A future
plan can move per-object verbs into the object YAML schema so the
templates become content-driven rather than tool-driven.
"""

import argparse
import os
import re
import sys
import yaml
from pathlib import Path

# Insert repo root so `tools.shared_toolkit.*` imports resolve.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tools.shared_toolkit.paths as toolkit_paths
import tools.shared_toolkit.protocols as toolkit_protocols
import tools.shared_toolkit.interactive as toolkit_interactive
import tools.shared_toolkit.reporter as reporter


# Path constants come from the shared toolkit so every tool reads from
# the same anchor. Module-level aliases preserve the existing call
# sites in this file without churn.
REPO_ROOT = toolkit_paths.REPO_ROOT
CONTENT_ROOT = toolkit_paths.CONTENT_ROOT
PROTOCOLS_DIR = toolkit_paths.PROTOCOLS_DIR
OBJECTS_DIR = toolkit_paths.OBJECTS_DIR

# Bulk-write directory. Per REPO_STYLE.md, reuse a stable CWD-relative
# folder ("output_*") instead of /tmp so the artifacts are visible next
# to the repo and survive across runs.
DEFAULT_BULK_OUT_DIR = "output_manuals"

# HTML entity normalization for entities seen in shipped YAML.
# Markdown renders bare entities like &micro; literally on many platforms,
# so normalize to ASCII per docs/MARKDOWN_STYLE.md.
HTML_ENTITY_MAP = {
	"&micro;": "u",
	"&alpha;": "a",
	"&beta;": "b",
	"&gamma;": "g",
	"&delta;": "d",
	"&mu;": "u",
	"&deg;": "deg",
	"&plusmn;": "+/-",
	"&times;": "x",
	"&rarr;": "->",
	"&larr;": "<-",
	"&lrarr;": "<->",
}

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
def normalize_entities(text):
	"""Replace HTML entities with ASCII per HTML_ENTITY_MAP."""
	if not isinstance(text, str):
		return text
	for entity, replacement in HTML_ENTITY_MAP.items():
		text = text.replace(entity, replacement)
	return text


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
		for filename in sorted(os.listdir(OBJECTS_DIR)):
			if not filename.endswith(".yaml"):
				continue
			path = os.path.join(OBJECTS_DIR, filename)
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
	path = os.path.join(PROTOCOLS_DIR, protocol_name, "materials.yaml")
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
		if numeric == int(numeric):
			value_str = str(int(numeric))
		else:
			value_str = f"{numeric:g}"
	except (TypeError, ValueError):
		value_str = str(value)
	unit_str = unit if unit else ""
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
def render_step(step, catalog, material_labels, sim, touched_objects):
	"""
	Render one step. Walks the sequence applying multi-interaction
	grouping where patterns match, with per-step touched-object tracking
	for the verify-vs-pickup fallback heuristic.
	"""
	lines = []
	step_name = step["step_name"]
	prompt = normalize_entities(step.get("prompt", "") or "")
	sequence = step.get("sequence", []) or []

	pretty = step_name.replace("_", " ").capitalize()
	lines.append(f"### {pretty}")
	lines.append("")
	lines.append(prompt)
	lines.append("")

	if not sequence:
		lines.append("*(no interactions)*")
		lines.append("")
		return lines

	prompt_says_verify = any(
		prompt.lower().lstrip().startswith(kw) for kw in VERIFY_PROMPT_KEYWORDS
	)
	step_touched = set()

	index = 0
	while index < len(sequence):
		consumed, sentences = render_group_at(
			sequence, index, catalog, material_labels, sim,
			touched_objects, step_touched, prompt_says_verify,
		)
		for sentence in sentences:
			lines.append(sentence)
		index += consumed

	lines.append("")
	return lines


#============================================
def render_group_at(sequence, index, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify):
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
					catalog, material_labels, sim,
				)
				for sub in (interaction, adjust_i, source_i, dest_i):
					_mark_touched(sub, touched_objects, step_touched)
					apply_state_changes(sub, sim)
				return 4, [sentence]

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
					catalog, material_labels, sim,
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
	sentence = render_single_interaction(
		interaction, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify,
	)
	_mark_touched(interaction, touched_objects, step_touched)
	apply_state_changes(interaction, sim)
	return 1, [sentence]


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
	if index >= 1:
		prior = sequence[index - 1]
		if prior.get("gesture") == "adjust" and prior.get("target") == pipette:
			value = (prior.get("validator", {}) or {}).get("value", {}) or {}
			for key in ("held_material_volume", "set_volume"):
				if key in value:
					add_vol = value[key]
					add_unit = catalog.unit_for_field(pipette, key)
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
def render_pipette_transfer(pipette_name, adjust_i, source_i, dest_i,
		catalog, material_labels, sim):
	"""
	Render one combined sentence for a pipette transfer. Resolves volume
	in priority: adjust value -> source delta -> dest delta. Resolves
	material in priority: source's tracked material_name -> dest's new
	material_name. Suppresses redundant material phrase when source label
	already overlaps with material label.
	"""
	pipette_label = catalog.label(pipette_name)
	source_name = source_i.get("target", "")
	dest_name = dest_i.get("target", "")
	source_label = catalog.label(source_name)
	dest_label = catalog.label(dest_name)

	volume = None
	unit = ""

	if adjust_i is not None:
		validator = adjust_i.get("validator", {}) or {}
		value = validator.get("value", {}) or {}
		for vol_key in ("held_material_volume", "set_volume"):
			if vol_key in value:
				volume = value[vol_key]
				unit = catalog.unit_for_field(pipette_name, vol_key)
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
		if "material_volume" in new_state:
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

	if volume is None and dest_change is not None:
		new_state = dest_change.get("state", {}) or {}
		if "material_volume" in new_state:
			old = sim.get(dest_change.get("target"), "material_volume")
			try:
				old_val = float(old) if old is not None else 0.0
				delta = float(new_state["material_volume"]) - old_val
				if delta > 0:
					volume = delta
					unit = catalog.unit_for_field(
						dest_change.get("target"), "material_volume"
					)
			except (TypeError, ValueError):
				pass

	material_name = sim.get(source_name, "material_name")
	if not material_name or material_name == "empty":
		if dest_change is not None:
			new_state = dest_change.get("state", {}) or {}
			if "material_name" in new_state:
				material_name = new_state["material_name"]

	material_label = label_for_material(material_name or "", material_labels)

	parts = [f"- Using the {_lower_first(pipette_label)},"]
	if volume is not None:
		parts.append("aspirate")
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
def render_single_interaction(interaction, catalog, material_labels, sim,
		touched_objects, step_touched, prompt_says_verify):
	"""Render one ungrouped interaction."""
	gesture = interaction.get("gesture", "click")
	target = interaction.get("target", "")
	target_label = catalog.label(target)
	response = interaction.get("response", {}) or {}
	scene_ops = response.get("scene_operations", []) or []

	# TimedWait
	for op in scene_ops:
		if op.get("type") == "TimedWait":
			minutes = op.get("duration_min", "?")
			display = normalize_entities(op.get("display", "") or "")
			seconds = None
			try:
				numeric = float(minutes)
				if 0 < numeric < 1:
					seconds = int(round(numeric * 60))
			except (TypeError, ValueError):
				pass
			wait = f"**{seconds} sec**" if seconds is not None else f"**{minutes} min**"
			if display:
				return f"- Wait {wait} ({display})."
			return f"- Wait {wait}."

	# SceneChange
	for op in scene_ops:
		if op.get("type") == "SceneChange":
			to_scene = op.get("to_scene", "").replace("_", " ")
			return f"- Move to the **{to_scene}**."

	# adjust gesture
	if gesture == "adjust":
		validator = interaction.get("validator", {}) or {}
		value = validator.get("value", {}) or {}
		for vol_key, field_label in (
			("held_material_volume", "volume"),
			("set_volume", "volume"),
			("set_temperature", "temperature"),
			("set_rpm", "speed"),
			("set_time_s", "timer"),
			("set_time_min", "timer"),
		):
			if vol_key in value:
				unit = catalog.unit_for_field(target, vol_key)
				return (
					f"- Set the {_lower_first(target_label)} {field_label} "
					f"to {format_volume(value[vol_key], unit)}."
				)
		return f"- Adjust the {_lower_first(target_label)}."

	state_changes = find_state_changes(scene_ops)

	# Indirect cause-effect: click on X mutates Y (Y != X).
	for change in state_changes:
		change_target = change.get("target", "")
		if change_target and change_target != target:
			new_state = change.get("state", {}) or {}
			field, value = next(iter(new_state.items()))
			pretty_field = field.replace("_", " ")
			pretty_value = str(value).replace("_", " ")
			change_label = catalog.label(change_target)
			if "cleanliness" in field and "ethanol" in str(value):
				return (
					f"- Use the {_lower_first(target_label)} to spray and "
					f"sterilize the {change_label}."
				)
			return (
				f"- Use the {_lower_first(target_label)} to update the "
				f"{change_label} ({pretty_field} -> {pretty_value})."
			)

	# State change on the click target.
	for change in state_changes:
		if change.get("target") != target:
			continue
		new_state = change.get("state", {}) or {}
		if "material_name" in new_state:
			new_material = new_state["material_name"]
			if new_material == "empty":
				return f"- Aspirate and remove the contents of the {target_label}."
			material_label = label_for_material(new_material, material_labels)
			volume = new_state.get("material_volume")
			if volume is not None:
				old_vol = sim.get(target, "material_volume")
				try:
					old_val = float(old_vol) if old_vol is not None else 0.0
					delta = float(volume) - old_val
					if delta > 0:
						unit = catalog.unit_for_field(target, "material_volume")
						return (
							f"- Add {format_volume(delta, unit)} of "
							f"{material_label} to the {target_label}."
						)
				except (TypeError, ValueError):
					pass
				unit = catalog.unit_for_field(target, "material_volume")
				return (
					f"- The {target_label} now contains "
					f"{format_volume(volume, unit)} of {material_label}."
				)
			return f"- The {target_label} now contains {material_label}."

		if "material_volume" in new_state and "material_name" not in new_state:
			old_vol = sim.get(target, "material_volume")
			new_vol = new_state["material_volume"]
			try:
				old_val = float(old_vol) if old_vol is not None else 0.0
				delta = old_val - float(new_vol)
				if delta > 0:
					unit = catalog.unit_for_field(target, "material_volume")
					return (
						f"- Draw {format_volume(delta, unit)} from the {target_label}."
					)
			except (TypeError, ValueError):
				pass
			return f"- Draw from the {target_label}."

		# Other state field (status, cleanliness, boolean flags).
		field, value = next(iter(new_state.items()))
		pretty_field = field.replace("_", " ")
		pretty_value = str(value).replace("_", " ")
		return f"- The {target_label} is now {pretty_field}: *{pretty_value}*."

	# Bare CursorAttach only -> pickup.
	for op in scene_ops:
		if op.get("type") == "CursorAttach":
			return f"- Pick up the {target_label}."

	# Bare click with no scene_ops: verify or pickup.
	if gesture == "click" and not scene_ops:
		if prompt_says_verify:
			return f"- Verify the {target_label}."
		if target in touched_objects and target not in step_touched:
			return f"- Verify the {target_label}."
		return f"- Pick up the {target_label}."

	return f"- Interact with the {target_label}."


#============================================
def render_learning_block(learning):
	"""Render the learning block; normalize HTML entities in body text."""
	lines = ["## Learning", ""]
	objectives = normalize_entities(learning.get("objectives", "") or "")
	outcomes = normalize_entities(learning.get("outcomes", "") or "")
	goals = normalize_entities(learning.get("goals", "") or "")
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
def render_protocol_manual(protocol_name, catalog):
	"""Render a mini-protocol or sequence runner; return markdown string."""
	protocol_path = os.path.join(PROTOCOLS_DIR, protocol_name, "protocol.yaml")
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
		for name in constituents:
			lines.append("---")
			lines.append("")
			child_md = render_protocol_manual(name, catalog)
			if child_md.startswith("# "):
				child_md = "## " + child_md[2:]
			lines.append(child_md)
		return "\n".join(lines)

	material_labels = load_material_labels(protocol_name)
	sim = StateSimulator(catalog)
	touched_objects = set()

	steps_by_name = {}
	for step in protocol.get("steps", []) or []:
		steps_by_name[step["step_name"]] = step

	lines.append("## Procedure")
	lines.append("")

	step_number = 1
	current_name = protocol.get("entry_step")
	visited = set()
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
			step, catalog, material_labels, sim, touched_objects,
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
	parser = argparse.ArgumentParser(
		description=(
			"Render mini-protocol YAML to a human-readable lab manual. "
			"Single mode writes ./<name>.md to the current directory; "
			"--all writes to ./output_manuals/."
		),
	)

	selection_group = parser.add_argument_group("Selection")
	selection_group.add_argument(
		"protocol", nargs="?",
		help="Protocol name or path to render (single-protocol mode).",
	)
	selection_group.add_argument(
		"-p", "--protocol", dest="protocol_names", nargs="+",
		help="One or more protocol names or paths to render.",
	)
	selection_group.add_argument(
		"-a", "--all", dest="render_all", action="store_true",
		help=f"Render every shipped protocol to {DEFAULT_BULK_OUT_DIR}/.",
	)
	selection_group.add_argument(
		"--list-protocols",
		dest="list_protocols_flag", action="store_true",
		help="List available protocols and exit.",
	)
	selection_group.add_argument(
		"--interactive",
		dest="interactive", action="store_true",
		help="Pick a protocol from a numbered menu.",
	)

	output_group = parser.add_argument_group("Output")
	output_group.add_argument(
		"-o", "--out", dest="out_dir", default=None,
		help=(
			"Output directory. Default: CWD for single, "
			f"{DEFAULT_BULK_OUT_DIR}/ for --all."
		),
	)
	output_group.add_argument(
		"--stdout", dest="to_stdout", action="store_true",
		help="Print rendered markdown to stdout instead of writing a file.",
	)

	verbosity_group = parser.add_argument_group("Verbosity")
	verbosity_group.add_argument(
		"-q", "--quiet", dest="quiet", action="store_true",
		help="Suppress section headers and PASS lines.",
	)
	verbosity_group.add_argument(
		"-v", "--verbose", dest="verbose", action="store_true",
		help="Print extra detail (no extra detail currently; reserved).",
	)

	args = parser.parse_args()
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
			reporter.print_error(f"Protocol '{name_or_path}' not found.")
			return None, False
		resolved.append(toolkit_protocols.protocol_name_from_path(path))
	return resolved, False


#============================================
def main():
	"""Dispatch by selection mode; write or print rendered manuals."""
	args = parse_args()

	# --list-protocols is a fast filesystem operation.
	if args.list_protocols_flag:
		for name in toolkit_protocols.list_protocols():
			print(name)
		sys.exit(0)

	names, is_bulk = _collect_selection(args)
	if names is None:
		reporter.print_error(
			"pass a <protocol> name, --protocol NAME..., --interactive, or --all."
		)
		sys.exit(2)

	catalog = ObjectCatalog()

	# Choose output sink. --stdout overrides everything; otherwise pick a
	# directory. Bulk defaults to output_manuals/; single defaults to CWD.
	if args.to_stdout:
		for name in names:
			if not args.quiet:
				reporter.print_section_header(name)
			print(render_protocol_manual(name, catalog))
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
			reporter.print_section_header(f"Rendering {name}")
		md = render_protocol_manual(name, catalog)
		out_path = write_manual(name, md, out_dir)
		if not args.quiet:
			reporter.print_pass(out_path)

	if not args.quiet:
		reporter.print_summary_line(
			len(names), failures, item_label="manuals",
		)

	sys.exit(0)


if __name__ == "__main__":
	main()
