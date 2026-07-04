#!/usr/bin/env python3
"""
Rank scenes by layout-quality metrics for inspection and flagging.

Reads the precomputed per-scene metrics under test-results/layout_metrics/ and,
for the pedagogy axis, joins each per-protocol scene to its protocol's clicked
targets under content/protocols/. Prints ranked tables so a reviewer can flag
scenes worth inspecting: heavily downscaled scenes, coupling-limited scenes,
collapse candidates, and scenes where a clicked target renders too small.

Run:
    source source_me.sh && python3 tools/rank_scene_layout.py
    source source_me.sh && python3 tools/rank_scene_layout.py --metric collapsibility
    source source_me.sh && python3 tools/rank_scene_layout.py --targets-only
"""

# Standard Library
import os
import sys
import glob
import json
import argparse

# PIP3 modules
import yaml

# local repo modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tests'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pipeline'))
import file_utils
import scene_inheritance

REPO_ROOT = file_utils.get_repo_root()
METRICS_DIR = os.path.join(REPO_ROOT, 'test-results', 'layout_metrics')
PROTOCOLS_DIR = os.path.join(REPO_ROOT, 'content', 'protocols')
BASE_SCENES_DIR = os.path.join(REPO_ROOT, 'content', 'base_scenes')

# Dev and adversarial fixtures are intentionally empty or overloaded; exclude
# them from ranking so they do not dominate the "worst scene" tables.
DEV_FIXTURES = {
	'missing_svg_check', 'select_check', 'type_check', 'adversarial_overflow_smoke',
}

# An object counts as crowded (zone-width limited, not collapse-fixable) when its
# density-map shrink drops below this. Above it, the object fits its zone and any
# remaining downscale comes from the global uniform rescale (collapse-fixable).
CROWD_THRESHOLD = 0.98


#============================================
# Metric loading
#============================================

def load_scene_metrics() -> list[dict]:
	"""
	Load every per-scene metrics JSON, skipping dev fixtures.
	"""
	pattern = os.path.join(METRICS_DIR, '*_metrics.json')
	scenes = []
	for path in sorted(glob.glob(pattern)):
		name = os.path.basename(path).replace('_metrics.json', '')
		if name in DEV_FIXTURES:
			continue
		with open(path) as handle:
			data = json.load(handle)
		scenes.append({'name': name, 'raw': data})
	return scenes


def geometric_metrics(raw: dict) -> dict:
	"""
	Compute the geometric ranking metrics for one scene from its raw metrics.
	"""
	per_object = raw['per_object']
	scales = [item['final_scale'] for item in per_object]
	fill_fraction = raw.get('fill', {}).get('fraction', 0.0)
	factor = raw['uniform_rescale'].get('factor')
	factor = 1.0 if factor is None else factor
	# label_dominant is True when the uniform rescale is driven by label vertical
	# overflow rather than object tier-row overhead; a tier collapse cannot help
	# these scenes even when collapsibility looks HIGH
	label_dominant = raw['uniform_rescale'].get('label_dominant', False)
	# distinct populated depth_tier rows; a collapse needs more than one to fold
	tier_rows = len({item['depth_tier'] for item in per_object if item.get('depth_tier') is not None})
	# occupancy per zone, used for the imbalance metric
	zone_occ = [z.get('occupied_fraction', 0.0) for z in raw.get('zone_occupancy', {}).values()]
	# an object is a coupling victim when it is not crowded yet still downscaled:
	# its shrink comes entirely from the global uniform factor
	victims = 0
	crowd_bound = 0
	for item in per_object:
		dm_shrink = item.get('dm_shrink')
		if dm_shrink is None:
			dm_shrink = 1.0
		if dm_shrink < CROWD_THRESHOLD:
			crowd_bound += 1
		elif item['final_scale'] < CROWD_THRESHOLD:
			victims += 1
	object_count = len(per_object)
	empty_fraction = 1.0 - fill_fraction
	coupling_loss = 1.0 - factor
	# the true "a 2->1 collapse will help" signal: not label-driven, no zone-width
	# limited objects, and more than one tier row to fold together
	tier_collapsible = (not label_dominant) and crowd_bound == 0 and tier_rows > 1
	metrics = {
		'factor': factor,
		'mean_scale': sum(scales) / object_count if object_count else 0.0,
		'min_scale': min(scales) if scales else 0.0,
		'empty_fraction': empty_fraction,
		'coupling_loss': coupling_loss,
		# sparse AND squeezed: the prime signal for a 2->1 tier collapse
		'collapsibility': empty_fraction * coupling_loss,
		'victim_fraction': victims / object_count if object_count else 0.0,
		'crowd_bound_count': crowd_bound,
		'zone_spread': (max(zone_occ) - min(zone_occ)) if zone_occ else 0.0,
		'overlap_count': raw['overlap_graph']['summary'].get('overlap_count', 0),
		'label_dominant': label_dominant,
		'tier_rows': tier_rows,
		'tier_collapsible': tier_collapsible,
	}
	return metrics


#============================================
# Pedagogy axis: target prominence
#============================================

def build_scene_targets() -> dict:
	"""
	Map each per-protocol scene_name to the set of target base-names its protocol
	clicks. A target is matched later against a scene object by object_name or
	placement_name, so a target only counts in the scene where it is placed.
	"""
	scene_to_protocol_dir = {}
	scene_glob = os.path.join(PROTOCOLS_DIR, '**', 'scenes', '*.yaml')
	for scene_path in glob.glob(scene_glob, recursive=True):
		with open(scene_path) as handle:
			scene_doc = yaml.safe_load(handle)
		if not isinstance(scene_doc, dict):
			continue
		scene_name = scene_doc.get('scene_name')
		if scene_name is None:
			continue
		# the mounting protocol.yaml is two levels up from scenes/<file>.yaml
		protocol_dir = os.path.dirname(os.path.dirname(scene_path))
		scene_to_protocol_dir[scene_name] = protocol_dir
	# gather targets per protocol directory once, then fan out to its scenes
	protocol_targets_cache = {}
	scene_targets = {}
	for scene_name, protocol_dir in scene_to_protocol_dir.items():
		if protocol_dir not in protocol_targets_cache:
			protocol_targets_cache[protocol_dir] = protocol_target_names(protocol_dir)
		scene_targets[scene_name] = protocol_targets_cache[protocol_dir]
	return scene_targets


def protocol_target_names(protocol_dir: str) -> set:
	"""
	Collect every distinct target base-name from a protocol.yaml. A target of the
	form 'object.subpart' contributes its base object name.
	"""
	protocol_path = os.path.join(protocol_dir, 'protocol.yaml')
	if not os.path.exists(protocol_path):
		return set()
	with open(protocol_path) as handle:
		protocol_doc = yaml.safe_load(handle)
	targets = set()
	collect_targets(protocol_doc, targets)
	# reduce 'object.subpart' to the base object name for matching
	base_names = set()
	for target in targets:
		base_names.add(target.split('.')[0])
	return base_names


def collect_targets(node: object, out: set) -> None:
	"""
	Recursively collect every value under a 'target' key in a protocol document.
	"""
	if isinstance(node, dict):
		for key, value in node.items():
			if key == 'target' and isinstance(value, str):
				out.add(value)
			else:
				collect_targets(value, out)
	elif isinstance(node, list):
		for item in node:
			collect_targets(item, out)


def build_placement_object_map() -> dict:
	"""
	Map each scene_name to a {placement_name: object_name} dict resolved through
	the scene inheritance chain. Base scenes contribute their raw placements
	directly; per-protocol scenes are resolved against the base scenes via
	scene_inheritance.resolve_protocol_scene so add/reposition/deactivate
	placement operations are reflected in the final placement -> object mapping.
	"""
	base_scenes_dict = {}
	scene_placement_maps = {}
	base_glob = os.path.join(BASE_SCENES_DIR, '*.yaml')
	for base_path in sorted(glob.glob(base_glob)):
		with open(base_path) as handle:
			base_data = yaml.safe_load(handle)
		if not isinstance(base_data, dict):
			continue
		scene_name = base_data.get('scene_name')
		if scene_name is None:
			continue
		base_scenes_dict[scene_name] = base_data
		scene_placement_maps[scene_name] = placement_object_dict(base_data)

	protocol_scene_glob = os.path.join(PROTOCOLS_DIR, '**', 'scenes', '*.yaml')
	for scene_path in glob.glob(protocol_scene_glob, recursive=True):
		with open(scene_path) as handle:
			protocol_scene_data = yaml.safe_load(handle)
		if not isinstance(protocol_scene_data, dict):
			continue
		scene_name = protocol_scene_data.get('scene_name')
		if scene_name is None:
			continue
		resolved = scene_inheritance.resolve_protocol_scene(
			scene_name, protocol_scene_data, base_scenes_dict,
		)
		scene_placement_maps[scene_name] = placement_object_dict(resolved)
	return scene_placement_maps


def placement_object_dict(scene_data: dict) -> dict:
	"""
	Build a {placement_name: object_name} dict from one resolved scene's
	placements list.
	"""
	placements = scene_data.get('placements', [])
	mapping = {}
	for placement in placements:
		placement_name = placement.get('placement_name')
		object_name = placement.get('object_name')
		if placement_name is not None and object_name is not None:
			mapping[placement_name] = object_name
	return mapping


def target_prominence(raw: dict, target_names: set, placement_objects: dict) -> dict | None:
	"""
	Compare clicked-target object scales against the non-target median for one
	scene. Returns None when the scene has no matched target (for example a base
	scene with no mounting protocol).
	"""
	per_object = raw['per_object']
	target_scales = []
	nontarget_scales = []
	for item in per_object:
		placement_name = item.get('placement_name')
		object_name = placement_objects.get(placement_name)
		is_target = object_name in target_names or placement_name in target_names
		if is_target:
			target_scales.append(item['final_scale'])
		else:
			nontarget_scales.append(item['final_scale'])
	if not target_scales:
		return None
	nontarget_median = median(nontarget_scales) if nontarget_scales else 1.0
	lowest_target = min(target_scales)
	# ratio < 1 means the least-prominent clicked target renders smaller than a
	# typical non-target object: the thing the student must find is receding
	ratio = lowest_target / nontarget_median if nontarget_median else 1.0
	result = {
		'lowest_target_scale': lowest_target,
		'nontarget_median': nontarget_median,
		'prominence_ratio': ratio,
		'target_count': len(target_scales),
	}
	return result


def median(values: list) -> float:
	"""
	Plain median of a non-empty list of numbers.
	"""
	ordered = sorted(values)
	count = len(ordered)
	middle = count // 2
	if count % 2 == 1:
		return ordered[middle]
	pair_mean = (ordered[middle - 1] + ordered[middle]) / 2.0
	return pair_mean


#============================================
# Reporting
#============================================

GEOMETRIC_RANKERS = [
	('collapsibility', 'COLLAPSIBILITY = empty x coupling_loss (2->1 collapse candidates)', True),
	('coupling_loss', 'coupling loss = 1 - uniform factor (scale lost globally)', True),
	('victim_fraction', 'uncrowded-victim fraction (objects shrunk purely by coupling)', True),
	('crowd_bound_count', 'crowd-bound count (zone-width limited, NOT collapse-fixable)', True),
	('zone_spread', 'zone occupancy imbalance (max - min occupied fraction)', True),
	('mean_scale', 'mean final_scale (most downscaled first)', False),
]

# One-line "what a high value means" per metric, in the style of the health
# report bands notes. mean_scale and prominence_ratio are the two where LOW is bad.
METRIC_DESCRIPTIONS = {
	'collapsibility': (
		'HIGH: sparse and squeezed -> a 2->1 tier collapse likely lifts it (crowd=0) toward full '
		'size. Only actionable when label_dominant is False; when label_dominant is True the '
		'uniform rescale is driven by label overflow, not tier overhead, and needs a label-space '
		'or engine fix instead.'
	),
	'coupling_loss': 'HIGH: much scale lost to the global uniform rescale, independent of crowding.',
	'victim_fraction': 'HIGH: most objects are uncrowded yet shrunk -> pure coupling, the architect signal.',
	'crowd_bound_count': 'HIGH: many objects are zone-width limited; a collapse cannot fix these, only a wider zone or the engine.',
	'zone_spread': 'HIGH: one zone is stuffed while others sit empty -> a redistribution candidate.',
	'mean_scale': 'LOW: the average object renders small (heavily downscaled scene).',
	'prominence_ratio': 'LOW (<1): a clicked target renders smaller than a typical non-target -> the object to find is buried.',
}

# Axes where a HIGH value marks a scene as a worst-tier candidate, used by the
# priority roll-up. mean_scale and prominence are handled separately (low is bad).
PRIORITY_HIGH_AXES = ['coupling_loss', 'collapsibility', 'victim_fraction', 'crowd_bound_count', 'zone_spread']


def print_geometric(scenes: list, metric_key: str | None, top_n: int) -> None:
	"""
	Print the geometric ranking tables (all rankers, or one when metric_key set).
	"""
	rankers = GEOMETRIC_RANKERS
	if metric_key is not None:
		rankers = [r for r in rankers if r[0] == metric_key]
	for key, label, descending in rankers:
		ranked = sorted(scenes, key=lambda s: s['metrics'][key], reverse=descending)
		print(f"\n== {label} ==")
		for scene in ranked[:top_n]:
			value = scene['metrics'][key]
			crowd = scene['metrics']['crowd_bound_count']
			factor = scene['metrics']['factor']
			value_text = f"{value:.3f}" if isinstance(value, float) else str(value)
			print(f"  {value_text:>8}  {scene['name'][:50]:50} (f={factor:.2f} crowd={crowd})")


def print_target_prominence(scenes: list, top_n: int) -> None:
	"""
	Print the pedagogy ranking: scenes where a clicked target is least prominent.
	"""
	scored = [s for s in scenes if s.get('prominence') is not None]
	ranked = sorted(scored, key=lambda s: s['prominence']['prominence_ratio'])
	print("\n== TARGET PROMINENCE = lowest target scale / non-target median (worst first) ==")
	print("   ratio < 1.00 means a clicked target renders smaller than a typical non-target")
	for scene in ranked[:top_n]:
		prom = scene['prominence']
		flag = ' [TARGET RECEDES]' if prom['prominence_ratio'] < 1.0 else ''
		print(
			f"  {prom['prominence_ratio']:>5.2f}  {scene['name'][:44]:44} "
			f"target={prom['lowest_target_scale']:.3f} median={prom['nontarget_median']:.3f}{flag}"
		)


#============================================
# Combined priority roll-up
#============================================

def percentile_threshold(values: list, fraction: float) -> float:
	"""
	Value at the given fraction through a sorted list (0.75 = 75th percentile).
	"""
	if not values:
		return 0.0
	ordered = sorted(values)
	index = int(fraction * (len(ordered) - 1))
	return ordered[index]


def assign_priority(scenes: list) -> None:
	"""
	Score each scene by how many axes place it in the worst tier. A scene that is
	both hard to read and pedagogically buried scores higher than one that is
	merely coupled, so inspection time goes where impact is highest. Stores
	'priority_score' and 'priority_axes' on each scene.
	"""
	# worst tier per high-bad axis = at or above the 75th percentile of the corpus
	thresholds = {}
	for axis in PRIORITY_HIGH_AXES:
		thresholds[axis] = percentile_threshold([s['metrics'][axis] for s in scenes], 0.75)
	for scene in scenes:
		axes = []
		for axis in PRIORITY_HIGH_AXES:
			if scene['metrics'][axis] >= thresholds[axis] and scene['metrics'][axis] > 0:
				axes.append(axis)
		# a receding target is a worst-tier pedagogy hit regardless of percentile
		prominence = scene.get('prominence')
		if prominence is not None and prominence['prominence_ratio'] < 1.0:
			axes.append('target_receding')
		scene['priority_axes'] = axes
		# the flag fires only when more than one axis is bad at once
		scene['priority_score'] = len(axes) if len(axes) > 1 else 0


def print_combined(scenes: list, top_n: int) -> None:
	"""
	Print one row per scene with every axis, ordered by the priority roll-up so
	the multi-axis problem scenes surface first.
	"""
	ranked = sorted(
		scenes,
		key=lambda s: (s['priority_score'], s['metrics']['coupling_loss']),
		reverse=True,
	)
	header = (
		f"{'scene':44} {'pri':>3} {'fctr':>5} {'mean':>5} {'coup':>5} "
		f"{'coll':>5} {'vic':>4} {'crwd':>4} {'zspr':>5} {'prom':>5} "
		f"{'lbldom':>6} {'tcoll':>5}"
	)
	print("\n== COMBINED per-scene table (ordered by priority roll-up) ==")
	print(header)
	for scene in ranked[:top_n]:
		met = scene['metrics']
		prom = scene.get('prominence')
		prom_text = f"{prom['prominence_ratio']:.2f}" if prom is not None else '  -'
		label_dominant_text = 'True' if met['label_dominant'] else 'False'
		tier_collapsible_text = 'True' if met['tier_collapsible'] else 'False'
		print(
			f"{scene['name'][:44]:44} {scene['priority_score']:>3} {met['factor']:>5.2f} "
			f"{met['mean_scale']:>5.2f} {met['coupling_loss']:>5.2f} {met['collapsibility']:>5.2f} "
			f"{met['victim_fraction']:>4.2f} {met['crowd_bound_count']:>4d} {met['zone_spread']:>5.2f} {prom_text:>5} "
			f"{label_dominant_text:>6} {tier_collapsible_text:>5}"
		)


def print_one_scene(scenes: list, name: str) -> None:
	"""
	Print every metric for a single named scene, with its description.
	"""
	match = None
	for scene in scenes:
		if scene['name'] == name:
			match = scene
			break
	if match is None:
		print(f"No metrics for scene '{name}'. Available scenes:")
		for scene in sorted(scenes, key=lambda s: s['name']):
			print(f"  {scene['name']}")
		return
	print(f"\n== {name} ==")
	print(f"priority_score = {match['priority_score']}  axes = {match['priority_axes'] or ['none']}")
	for key, _label, _desc in GEOMETRIC_RANKERS:
		value = match['metrics'][key]
		value_text = f"{value:.3f}" if isinstance(value, float) else str(value)
		print(f"  {key:20} {value_text:>8}   {METRIC_DESCRIPTIONS[key]}")
	label_dominant = match['metrics']['label_dominant']
	tier_collapsible = match['metrics']['tier_collapsible']
	tier_rows = match['metrics']['tier_rows']
	print(f"  {'label_dominant':20} {str(label_dominant):>8}   rescale driven by label overflow, not tier overhead.")
	print(f"  {'tier_rows':20} {tier_rows:>8}   distinct populated depth_tier rows.")
	print(
		f"  {'tier_collapsible':20} {str(tier_collapsible):>8}   "
		"True only when label_dominant is False, crowd_bound_count == 0, and tier_rows > 1."
	)
	prom = match.get('prominence')
	if prom is None:
		print(f"  {'prominence_ratio':20} {'  n/a':>8}   (base scene / no mounting protocol targets)")
	else:
		print(f"  {'prominence_ratio':20} {prom['prominence_ratio']:>8.3f}   {METRIC_DESCRIPTIONS['prominence_ratio']}")
		print(f"    lowest target scale {prom['lowest_target_scale']:.3f} vs non-target median {prom['nontarget_median']:.3f}")


#============================================
# Main
#============================================

def parse_args() -> argparse.Namespace:
	"""
	Parse command-line arguments.
	"""
	parser = argparse.ArgumentParser(description="Rank scenes by layout-quality metrics.")
	valid = [key for key, _, _ in GEOMETRIC_RANKERS]
	parser.add_argument(
		'-m', '--metric', dest='metric', choices=valid, default=None,
		help="Print only this geometric ranking (default: all).",
	)
	parser.add_argument(
		'-t', '--targets-only', dest='targets_only', action='store_true',
		help="Print only the target-prominence pedagogy ranking.",
	)
	parser.add_argument(
		'-n', '--top', dest='top_n', type=int, default=8,
		help="How many scenes to list per ranking.",
	)
	parser.add_argument(
		'-c', '--combined', dest='combined', action='store_true',
		help="Print only the combined per-scene table ordered by the priority roll-up.",
	)
	parser.add_argument(
		'scene', nargs='?', default=None,
		help="Inspect one scene by name (default: rank the whole corpus).",
	)
	args = parser.parse_args()
	return args


def main() -> None:
	"""
	Load metrics, compute rankings, and print the requested tables.
	"""
	args = parse_args()
	scenes = load_scene_metrics()
	scene_targets = build_scene_targets()
	scene_placement_maps = build_placement_object_map()
	for scene in scenes:
		scene['metrics'] = geometric_metrics(scene['raw'])
		target_names = scene_targets.get(scene['name'], set())
		placement_objects = scene_placement_maps.get(scene['name'], {})
		scene['prominence'] = target_prominence(scene['raw'], target_names, placement_objects)
	assign_priority(scenes)
	# single-scene inspection takes precedence when a name is given
	if args.scene is not None:
		print_one_scene(scenes, args.scene)
		return
	if args.combined:
		print_combined(scenes, args.top_n)
		return
	if args.targets_only:
		print_target_prominence(scenes, args.top_n)
		return
	print_geometric(scenes, args.metric, args.top_n)
	if args.metric is None:
		print_target_prominence(scenes, args.top_n)
		print_combined(scenes, args.top_n)


if __name__ == '__main__':
	main()
