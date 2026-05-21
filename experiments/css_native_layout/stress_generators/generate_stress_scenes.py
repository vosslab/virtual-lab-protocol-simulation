#!/usr/bin/env python3
"""
Stress scene generator for NEW3 CSS native layout experiments.

Produces YAML scene manifests under stress_scenes/generated/ following a
closed schema:

	scene_name: <str>
	scene_class: <enum>
	object_count: <int>
	large_equipment_count: <int>
	label_density: low | medium | high
	expected_primary_object: <object name from placements>
	intended_difficulty: easy | medium | hard | adversarial
	placements:
	  - object_name: <str>
	    zone: rear_shelf | work_surface | front_tools | instrument_station | popup_layer

No coordinate fields. No metadata blobs. No strategy fields. ASCII only.

Reproducible: each scene is seeded by its scene index.
"""

# Standard Library
import os
import sys
import random
import argparse


#============================================
# Object pools
#============================================

SMALL_TOOLS = [
	'micropipette_p10', 'micropipette_p200', 'micropipette_p1000',
	'tip_box_10', 'tip_box_200', 'gel_comb', 'slide', 'brush',
	'kimwipes', 'marker',
]

HANDHELD = [
	'ethanol_bottle', 'dmso_bottle', 'pbs_bottle', 'drug_vial',
	'sample_tube', 'microtube', 'ladder_tube',
]

CONTAINERS = [
	'well_plate_96', 'well_plate_24', 'flask_250ml', 'flask_1000ml',
	'beaker_250ml', 'gel_cassette', 'dilution_rack',
]

RACKS = [
	'tube_rack_15ml', 'tube_rack_24', 'microtube_rack', 'drug_vial_rack',
]

INSTRUMENTS = [
	'vortex', 'heat_block', 'hemocytometer', 'water_bath',
	'plate_reader', 'cell_counter',
]

LARGE_EQUIPMENT = [
	'centrifuge', 'microscope', 'electrophoresis_tank', 'power_supply',
	'incubator',
]

WASTE = ['waste_container', 'waste_tray']

# Bottles for the many_bottles_scene class
BOTTLES = [
	'ethanol_bottle', 'dmso_bottle', 'pbs_bottle', 'methanol_bottle',
	'tris_buffer_bottle', 'sds_bottle', 'glycerol_bottle',
	'sodium_hydroxide_bottle', 'hydrochloric_acid_bottle', 'water_bottle',
	'tween20_bottle', 'edta_bottle',
]

# Tall glassware for tall_glassware_scene
TALL_GLASSWARE = [
	'flask_1000ml', 'graduated_cylinder_1000ml', 'graduated_cylinder_500ml',
	'carboy_5l', 'erlenmeyer_2000ml',
]

# Long-label objects (intentionally verbose names)
LONG_LABEL_OBJECTS = [
	'sodium_dodecyl_sulfate_running_buffer_bottle',
	'phosphate_buffered_saline_solution_bottle_500ml',
	'tris_acetate_edta_electrophoresis_buffer_bottle',
	'concentrated_hydrochloric_acid_stock_bottle',
	'dimethyl_sulfoxide_vehicle_control_vial',
	'recombinant_human_insulin_growth_factor_stock',
	'fluorescein_isothiocyanate_conjugate_microtube',
	'polymerase_chain_reaction_master_mix_tube',
	'tetramethylethylenediamine_catalyst_bottle',
	'bovine_serum_albumin_blocking_solution_bottle',
]

# Extreme aspect objects (very tall paired with very wide)
EXTREME_TALL = ['graduated_cylinder_1000ml', 'carboy_5l', 'flask_1000ml']
EXTREME_WIDE = ['electrophoresis_tank', 'gel_cassette', 'water_bath']

ZONES = [
	'rear_shelf', 'work_surface', 'front_tools',
	'instrument_station', 'popup_layer',
]

#============================================
# Region placement caps (per-zone object count limits)
# Derived from CSS: 1920px viewport, footprint min-widths, 8px gap
# rear_shelf: ~1920 / (90+8) = 19 max single-row, but visual cap is 12
# work_surface: column layout, visual cap is 6 (vertical stack height limited)
# front_tools: ~19 max single-row, visual cap is 12
# instrument_station: 150px row, large-equipment fixed, visual cap is 5
#============================================

REGION_PLACEMENT_CAPS = {
	'rear_shelf': 12,          # handheld-heavy, visible realistic row
	'work_surface': 6,         # vertical-stack limited by min-height 120px
	'front_tools': 12,         # small-tool-heavy, similar to rear_shelf
	'instrument_station': 5,   # large-equipment fixed, limited row space
	'popup_layer': 1,          # overlays, max 1 at a time
}


#============================================
# Scene class enumeration and counts
#============================================

SCENE_CLASS_PLAN = [
	('template', 20),
	('composition', 20),
	('dense_clutter', 20),
	('instrument_heavy', 15),
	('zoom_detail', 10),
	('long_label_scene', 5),
	('tall_glassware_scene', 3),
	('many_small_tools_scene', 3),
	('many_bottles_scene', 2),
	('extreme_aspect_scene', 2),
]


#============================================
# Helpers
#============================================

def pick_zone_for_object(object_name: str, rng: random.Random) -> str:
	"""
	Map an object to a plausible zone using only its name category.
	No coordinates; the zone is the only spatial hint.
	"""
	# Bottles and rear-shelf reagents
	if 'bottle' in object_name or object_name in BOTTLES:
		return 'rear_shelf'
	# Large equipment and instruments belong at the instrument station
	if object_name in LARGE_EQUIPMENT:
		return 'instrument_station'
	if object_name in INSTRUMENTS:
		return 'instrument_station'
	# Pipettes and small handheld tools go up front
	if object_name in SMALL_TOOLS:
		return 'front_tools'
	# Waste up front by convention
	if object_name in WASTE:
		return 'front_tools'
	# Racks, plates, containers on the work surface
	if object_name in RACKS or object_name in CONTAINERS:
		return 'work_surface'
	# Tall glassware on rear shelf
	if object_name in TALL_GLASSWARE:
		return 'rear_shelf'
	# Default
	return 'work_surface'


def label_density_for_count(count: int) -> str:
	if count <= 4:
		return 'low'
	if count <= 10:
		return 'medium'
	return 'high'


def count_large_equipment(placements: list) -> int:
	total = 0
	for placement in placements:
		if placement['object_name'] in LARGE_EQUIPMENT:
			total += 1
	return total


def sample_unique(pool: list, n: int, rng: random.Random) -> list:
	"""
	Pick n names from pool. If n exceeds pool length, allow duplicates
	(common for racks and tubes in dense clutter scenes).
	"""
	if n <= len(pool):
		return rng.sample(pool, n)
	out = list(pool)
	while len(out) < n:
		out.append(rng.choice(pool))
	rng.shuffle(out)
	return out


#============================================
# Per-class scene builders
#============================================

def build_template(rng: random.Random) -> tuple:
	count = rng.randint(2, 4)
	primary = rng.choice(CONTAINERS + INSTRUMENTS)
	objects = [primary]
	pool = SMALL_TOOLS + HANDHELD
	objects += rng.sample(pool, count - 1)
	difficulty = 'easy'
	return objects, primary, difficulty


def build_composition(rng: random.Random) -> tuple:
	count = rng.randint(5, 9)
	primary = rng.choice(CONTAINERS + LARGE_EQUIPMENT)
	objects = [primary]
	supports = SMALL_TOOLS + HANDHELD + RACKS + WASTE
	objects += rng.sample(supports, count - 1)
	difficulty = rng.choice(['easy', 'medium'])
	return objects, primary, difficulty


def build_dense_clutter(rng: random.Random) -> tuple:
	count = rng.randint(12, 18)
	primary = rng.choice(['well_plate_96', 'well_plate_24', 'dilution_rack'])
	objects = [primary]
	pool = SMALL_TOOLS + HANDHELD + HANDHELD + RACKS + WASTE
	objects += sample_unique(pool, count - 1, rng)
	difficulty = rng.choice(['medium', 'hard'])
	return objects, primary, difficulty


def build_instrument_heavy(rng: random.Random) -> tuple:
	count = rng.randint(6, 10)
	n_large = rng.randint(2, 3)
	large_picks = rng.sample(LARGE_EQUIPMENT, min(n_large, len(LARGE_EQUIPMENT)))
	primary = large_picks[0]
	objects = list(large_picks)
	remaining = count - len(objects)
	supports = INSTRUMENTS + SMALL_TOOLS + WASTE
	objects += rng.sample(supports, remaining)
	difficulty = 'hard'
	return objects, primary, difficulty


def build_zoom_detail(rng: random.Random) -> tuple:
	count = rng.randint(1, 3)
	primary = rng.choice([
		'well_plate_96', 'microscope', 'hemocytometer', 'gel_cassette',
	])
	objects = [primary]
	if count > 1:
		pool = SMALL_TOOLS + HANDHELD
		objects += rng.sample(pool, count - 1)
	difficulty = 'easy'
	return objects, primary, difficulty


def build_long_label(rng: random.Random) -> tuple:
	count = rng.randint(6, 10)
	objects = rng.sample(LONG_LABEL_OBJECTS, min(count, len(LONG_LABEL_OBJECTS)))
	# Top up with a primary container if short
	while len(objects) < count:
		objects.append(rng.choice(CONTAINERS))
	primary = objects[0]
	difficulty = rng.choice(['hard', 'adversarial'])
	return objects, primary, difficulty


def build_tall_glassware(rng: random.Random) -> tuple:
	count = rng.randint(6, 10)
	n_tall = rng.randint(3, 5)
	tall = sample_unique(TALL_GLASSWARE, n_tall, rng)
	objects = list(tall)
	supports = SMALL_TOOLS + HANDHELD
	objects += rng.sample(supports, count - len(objects))
	primary = tall[0]
	difficulty = 'adversarial'
	return objects, primary, difficulty


def build_many_small_tools(rng: random.Random) -> tuple:
	count = rng.randint(15, 20)
	primary = 'well_plate_96'
	objects = [primary]
	objects += sample_unique(SMALL_TOOLS, count - 1, rng)
	difficulty = 'adversarial'
	return objects, primary, difficulty


def build_many_bottles(rng: random.Random) -> tuple:
	count = rng.randint(15, 20)
	objects = sample_unique(BOTTLES, count, rng)
	primary = objects[0]
	difficulty = 'adversarial'
	return objects, primary, difficulty


def build_extreme_aspect(rng: random.Random) -> tuple:
	count = rng.randint(6, 10)
	tall_pick = rng.sample(EXTREME_TALL, 2)
	wide_pick = rng.sample(EXTREME_WIDE, 2)
	objects = tall_pick + wide_pick
	pool = SMALL_TOOLS
	objects += rng.sample(pool, count - len(objects))
	primary = objects[0]
	difficulty = 'adversarial'
	return objects, primary, difficulty


SCENE_CLASS_BUILDERS = {
	'template': build_template,
	'composition': build_composition,
	'dense_clutter': build_dense_clutter,
	'instrument_heavy': build_instrument_heavy,
	'zoom_detail': build_zoom_detail,
	'long_label_scene': build_long_label,
	'tall_glassware_scene': build_tall_glassware,
	'many_small_tools_scene': build_many_small_tools,
	'many_bottles_scene': build_many_bottles,
	'extreme_aspect_scene': build_extreme_aspect,
}


#============================================
# YAML emission (handwritten, closed schema)
#============================================

def enforce_placement_caps(objects: list, rng: random.Random, difficulty: str = 'medium') -> tuple:
	"""
	Build placements respecting per-zone caps. Returns (placements_lines, is_realistic).

	Behavior:
	- If difficulty == 'adversarial': allow over-cap. Over-cap is intentional stress.
	- Otherwise: truncate at cap. Drop excess objects from placement list.
	"""
	placements_lines = []
	zone_counts = {zone: 0 for zone in ZONES}
	is_realistic = True
	for object_name in objects:
		zone = pick_zone_for_object(object_name, rng)
		cap = REGION_PLACEMENT_CAPS.get(zone, 999)
		if zone_counts[zone] < cap:
			# Within cap; add placement
			placements_lines.append('  - object_name: ' + object_name)
			placements_lines.append('    zone: ' + zone)
			zone_counts[zone] += 1
		else:
			# At or over cap
			if difficulty == 'adversarial':
				# Adversarial: allow over-cap intentionally
				placements_lines.append('  - object_name: ' + object_name)
				placements_lines.append('    zone: ' + zone)
				zone_counts[zone] += 1
				is_realistic = False
			else:
				# Realistic: truncate; skip this object entirely
				pass
	return placements_lines, is_realistic


def emit_scene_yaml(scene_name: str, scene_class: str, primary: str,
		objects: list, difficulty: str, realistic: bool = True) -> str:
	"""
	Build YAML text by hand to guarantee the closed schema. No coordinate
	fields are ever emitted, regardless of input.
	Includes 'realistic' metadata to distinguish adversarial scenes.
	"""
	rng = random.Random(scene_name)
	placements_lines, is_realistic = enforce_placement_caps(objects, rng, difficulty)
	# Compute meta fields from the resolved placements list
	placements_resolved = []
	for line_idx in range(0, len(placements_lines), 2):
		obj = placements_lines[line_idx].split(': ', 1)[1]
		placements_resolved.append({'object_name': obj})
	large_count = 0
	for placement in placements_resolved:
		if placement['object_name'] in LARGE_EQUIPMENT:
			large_count += 1
	count = len(objects)
	density = label_density_for_count(count)
	# If intended_difficulty is adversarial, always mark realistic=False
	# Otherwise, use the computed is_realistic from cap check
	final_realistic = not (difficulty == 'adversarial') and is_realistic
	# Assemble document text
	text = ''
	text += '# NEW3 stress scene: ' + scene_name + '\n'
	text += '# Class: ' + scene_class + '\n'
	text += '# Closed schema. No coordinate fields.\n'
	text += '\n'
	text += 'scene_name: ' + scene_name + '\n'
	text += 'scene_class: ' + scene_class + '\n'
	text += 'object_count: ' + str(count) + '\n'
	text += 'large_equipment_count: ' + str(large_count) + '\n'
	text += 'label_density: ' + density + '\n'
	text += 'expected_primary_object: ' + primary + '\n'
	text += 'intended_difficulty: ' + difficulty + '\n'
	text += 'realistic: ' + ('true' if final_realistic else 'false') + '\n'
	text += 'placements:\n'
	text += '\n'.join(placements_lines) + '\n'
	return text


#============================================
# Driver
#============================================

def parse_args():
	"""
	Parse command-line arguments.
	"""
	parser = argparse.ArgumentParser(
		description='Generate NEW3 stress scene manifests.'
	)
	parser.add_argument(
		'-c', '--count', dest='count', type=int, default=None,
		help='Optional total scene count override. Default uses class plan (~100).'
	)
	parser.add_argument(
		'-f', '--class-filter', dest='class_filter', type=str, default=None,
		help='Optional comma-separated list of scene_class values to include.'
	)
	parser.add_argument(
		'-o', '--out-dir', dest='out_dir', type=str,
		default='experiments/css_native_layout/stress_scenes/generated',
		help='Output directory for generated YAML.'
	)
	parser.add_argument(
		'-s', '--seed', dest='seed', type=int, default=42,
		help='Random seed for corpus generation. Default: 42 for reproducibility.'
	)
	args = parser.parse_args()
	return args


def resolve_repo_root() -> str:
	"""
	Walk up from this script to find the repo root.
	"""
	here = os.path.abspath(__file__)
	current = os.path.dirname(here)
	while current != '/':
		if os.path.isdir(os.path.join(current, '.git')):
			return current
		current = os.path.dirname(current)
	# Fallback: assume cwd is repo root
	return os.getcwd()


def build_class_plan(args) -> list:
	"""
	Resolve the (scene_class, count) plan, honoring filter and count overrides.
	"""
	allowed = None
	if args.class_filter is not None:
		allowed = set(args.class_filter.split(','))
	plan = []
	for scene_class, default_count in SCENE_CLASS_PLAN:
		if allowed is not None and scene_class not in allowed:
			continue
		plan.append((scene_class, default_count))
	# Optional total-count override scales proportionally
	if args.count is not None and len(plan) > 0:
		current_total = 0
		for _, n in plan:
			current_total += n
		scale = args.count / current_total
		scaled = []
		running = 0
		for scene_class, n in plan:
			new_n = max(1, int(round(n * scale)))
			scaled.append((scene_class, new_n))
			running += new_n
		plan = scaled
	return plan


def write_index(out_dir: str, entries: list) -> str:
	"""
	Emit INDEX.md listing every generated scene.
	"""
	index_path = os.path.join(out_dir, 'INDEX.md')
	lines = []
	lines.append('# Stress scene index')
	lines.append('')
	lines.append('Generated by stress_generators/generate_stress_scenes.py.')
	lines.append('')
	lines.append('| Filename | Class | Object count | Difficulty |')
	lines.append('| --- | --- | --- | --- |')
	for entry in entries:
		row = '| ' + entry['filename']
		row += ' | ' + entry['scene_class']
		row += ' | ' + str(entry['object_count'])
		row += ' | ' + entry['difficulty'] + ' |'
		lines.append(row)
	body = '\n'.join(lines) + '\n'
	fh = open(index_path, 'w')
	fh.write(body)
	fh.close()
	return index_path


def main():
	args = parse_args()
	repo_root = resolve_repo_root()
	# Resolve out_dir relative to repo root if not absolute
	if os.path.isabs(args.out_dir):
		out_dir = args.out_dir
	else:
		out_dir = os.path.join(repo_root, args.out_dir)
	if not os.path.isdir(out_dir):
		os.makedirs(out_dir)
	plan = build_class_plan(args)
	entries = []
	scene_global_index = 0
	for scene_class, n_scenes in plan:
		builder = SCENE_CLASS_BUILDERS[scene_class]
		for i in range(n_scenes):
			# Deterministic seed per scene: global seed + scene index offset
			seed = args.seed + (scene_global_index * 1000 + i)
			rng = random.Random(seed)
			objects, primary, difficulty = builder(rng)
			scene_name = 'stress_' + scene_class + '_' + str(i + 1).zfill(3)
			yaml_text = emit_scene_yaml(
				scene_name, scene_class, primary, objects, difficulty
			)
			filename = scene_name + '.yaml'
			out_path = os.path.join(out_dir, filename)
			fh = open(out_path, 'w')
			fh.write(yaml_text)
			fh.close()
			entries.append({
				'filename': filename,
				'scene_class': scene_class,
				'object_count': len(objects),
				'difficulty': difficulty,
			})
			scene_global_index += 1
	index_path = write_index(out_dir, entries)
	print('Generated ' + str(len(entries)) + ' scenes into ' + out_dir)
	print('Index: ' + index_path)
	# Class breakdown
	breakdown = {}
	for entry in entries:
		key = entry['scene_class']
		breakdown[key] = breakdown.get(key, 0) + 1
	for scene_class, _ in plan:
		print('  ' + scene_class + ': ' + str(breakdown.get(scene_class, 0)))


if __name__ == '__main__':
	main()
