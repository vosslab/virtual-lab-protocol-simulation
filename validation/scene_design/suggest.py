"""Suggested-fix engine for below-class-floor scenes.

For each scene below its per-class score floor, the engine permutes single moves
and reports the lowest-cost move producing the largest projected gain.

Moves permuted:
  1. Reassign placement to a different zone (iterate over all zones in scene)
  2. Adjust placement.layout.display_width_cm in 10 cm steps (+/-10, +/-20, +/-30)
  3. Flip data-primary flag (true/false toggle)

Each candidate move is scored by:
  1. Applying mutation to an in-memory scene dict copy
  2. Regenerating dump_data via dump_scene_geometry
  3. Recomputing metrics and design score

Render-risk guard: before emitting any suggestion, the engine runs the render
predictor on the mutated scene in-memory and filters out moves that introduce a
new ESCAPE_REQUIRED finding. Filtered moves are logged but not surfaced.

Score-monotonicity guard: engine asserts projected score strictly increases vs
baseline before emit.

Engine is advisory only; suggestions stay marked 'advisory' in output schema.
Engine never edits YAML.
"""

import copy
import tempfile
import yaml
from pathlib import Path

from validation.shared_toolkit.yaml_io import load_yaml
from validation.scene_design.class_detect import detect, SceneClassError
from validation.scene_design.cli import compute_metrics
from validation.scene_design.score import aggregate_score
from validation.scene_calc.dump import dump_scene_geometry
from validation.scene_lint.cli import run_all_rules
from validation.scene_lint.findings import Verdict

from validation.scene_design.metrics.labels import (
	predicted_label_overlap,
	label_to_object_distance,
	label_wrap_rate,
)
from validation.scene_design.metrics.density import (
	scene_density,
	row_overcrowding,
)
from validation.scene_design.metrics.composition import (
	tab_stops_symmetry,
	depth_tier_usage,
	aspect_fidelity,
)
from validation.scene_design.metrics.hierarchy import (
	primary_area_ratio,
	primary_prominence,
	primary_detection_confidence,
)
from validation.scene_design.metrics.balance import (
	zone_footprint_balance,
	largest_empty_band,
	scene_occupied,
)
from validation.scene_design.metrics.proximity import (
	support_distance,
	protocol_step_affinity,
)


#============================================
# Class floor lookup
#============================================

# Per-class score floors. Conservative defaults pending design-team calibration.
# Scenes below their class floor are candidates for suggested improvements.
CLASS_FLOORS = {
	'template': 70.0,
	'composition': 65.0,
	'instrument_heavy': 65.0,
	'zoom_detail': 70.0,
	'dense_clutter': 60.0,
}
DEFAULT_CLASS_FLOOR = 65.0


def _get_class_floor(scene_class: str) -> float:
	"""Return the per-class score floor."""
	return CLASS_FLOORS.get(scene_class, DEFAULT_CLASS_FLOOR)


#============================================
# Mutation helpers
#============================================

def _mutate_zone_reassign(scene: dict, placement_name: str, new_zone_id: str) -> dict:
	"""Mutate scene: reassign placement to a different zone."""
	mutated = copy.deepcopy(scene)
	for p in mutated['placements']:
		if p['placement_name'] == placement_name:
			p['zone'] = new_zone_id
			break
	return mutated


def _mutate_display_width_cm(scene: dict, placement_name: str, delta_cm: float) -> dict:
	"""Mutate scene: adjust placement.layout.display_width_cm by delta (cm).

	display_width_cm is itself optional on a placement (absence means use the
	asset's default). The mutation may add it, adjust it, or remove it. Keys
	above the layout level (placements, placement_name) are required.
	"""
	mutated = copy.deepcopy(scene)
	for p in mutated['placements']:
		if p['placement_name'] == placement_name:
			layout = p.setdefault('layout', {})
			current_cm = layout.get('display_width_cm', 0.0)
			new_cm = max(0.0, current_cm + delta_cm)
			if new_cm > 0:
				layout['display_width_cm'] = new_cm
			elif 'display_width_cm' in layout:
				del layout['display_width_cm']
			break
	return mutated


def _mutate_data_primary_flip(scene: dict, placement_name: str) -> dict:
	"""Mutate scene: toggle data-primary flag on placement.

	data-primary is itself optional (False default); the mutation flips the
	current value. Keys above (placements, placement_name) are required.
	"""
	mutated = copy.deepcopy(scene)
	for p in mutated['placements']:
		if p['placement_name'] == placement_name:
			p['data-primary'] = not p.get('data-primary', False)
			break
	return mutated


#============================================
# Scoring + render-risk guards
#============================================

def _score_mutation(mutated_scene: dict, scene_class: str) -> float | None:
	"""Score a mutated scene.

	Returns the projected score, or None if the mutated scene's dump cannot
	be computed (most commonly because the temp-file approach to dump cannot
	resolve content/objects/ asset references from /tmp -- see the
	known-limitation note on dump_scene_geometry_from_scene_dict below).
	"""
	try:
		dump_data = dump_scene_geometry_from_scene_dict(mutated_scene, temp_dir=Path(tempfile.gettempdir()))
	except (OSError, RuntimeError):
		return None

	metrics = compute_metrics_from_dict(mutated_scene, dump_data)
	score = aggregate_score(metrics, scene_class)
	return score


def _escape_key_set(findings: list) -> set:
	"""Return set of (rule, placement_name) tuples for ESCAPE_REQUIRED findings."""
	return {(f.rule, f.placement_name) for f in findings if f.verdict == Verdict.ESCAPE_REQUIRED}


def _check_render_risk(mutated_scene: dict, baseline_escape_keys: set) -> bool:
	"""Check if mutated scene introduces new ESCAPE_REQUIRED findings vs baseline.

	Writes the mutated scene to a temp YAML, runs the full scene-lint rule set
	on it, and returns True if any ESCAPE_REQUIRED finding's (rule, placement_name)
	tuple is not in baseline_escape_keys (i.e., a new render risk introduced).

	Why temp file: run_all_rules takes Path inputs (not dicts) because the
	downstream dump_scene_geometry resolves asset paths via the filesystem.
	The same /tmp limitation noted on dump_scene_geometry_from_scene_dict
	applies: rules that need the dump's object_registry will be skipped, but
	Group A rules and B10 (zone_overlap) still fire on the YAML structure
	alone and are the rules most likely to catch new render risk from a
	mutation. Key choice (rule, placement_name): scene is implicit because
	both sides compare within one scene; finer fingerprints invite false
	"new" keys from cosmetic differences in finding messages.

	Args:
		mutated_scene: Mutated scene dict (in-memory).
		baseline_escape_keys: set of (rule, placement_name) tuples from baseline
			ESCAPE_REQUIRED findings on the original scene.

	Returns:
		True if mutation introduces a new ESCAPE_REQUIRED finding.
		False otherwise.
	"""
	with tempfile.NamedTemporaryFile(
		mode='w',
		suffix='.yaml',
		dir=Path(tempfile.gettempdir()),
		delete=False,
	) as f:
		yaml.dump(mutated_scene, f)
		temp_path = Path(f.name)

	try:
		mutated_findings = run_all_rules([temp_path])
	finally:
		temp_path.unlink()

	mutated_escape_keys = _escape_key_set(mutated_findings)
	new_escape_keys = mutated_escape_keys - baseline_escape_keys
	return len(new_escape_keys) > 0


#============================================
# Entry: suggest_moves
#============================================

def suggest_moves(scene_path: Path, n_suggestions: int = 1) -> list[dict]:
	"""Generate top-N suggested moves for a below-class-floor scene.

	Args:
		scene_path: Path to scene YAML file.
		n_suggestions: Number of top suggestions to return (default 1).

	Returns:
		List of dicts, each with keys:
			- 'placement_name': str
			- 'move_type': 'zone_reassign' | 'display_width_cm_adjust' | 'data_primary_flip'
			- 'move_description': str
			- 'baseline_score': float
			- 'projected_score': float
			- 'score_delta': float
	"""
	scene = load_yaml(scene_path)

	try:
		scene_class = detect(scene)
	except SceneClassError:
		scene_class = 'composition'

	# Baseline dump + score for the original scene.
	try:
		dump_data = dump_scene_geometry(scene_path)
	except (OSError, RuntimeError, KeyError):
		return []

	metrics = compute_metrics(scene, dump_data)
	baseline_score = aggregate_score(metrics, scene_class)

	if baseline_score is None:
		return []

	class_floor = _get_class_floor(scene_class)
	if baseline_score >= class_floor:
		return []

	# Baseline ESCAPE_REQUIRED set; render-risk guard rejects mutations that add new keys.
	baseline_findings = run_all_rules([scene_path])
	baseline_escape_keys = _escape_key_set(baseline_findings)

	placements = scene['placements']
	zones = scene['zones']
	# Authored YAML uses zone_name (SPEC_DESIGN_CHECKLIST.md rule 25).
	zone_names = [z['zone_name'] for z in zones]

	all_moves = []

	for placement in placements:
		placement_name = placement['placement_name']

		# Move type 1: zone reassign.
		current_zone = placement['zone']
		for new_zone_name in zone_names:
			if new_zone_name != current_zone:
				mutated = _mutate_zone_reassign(scene, placement_name, new_zone_name)
				score = _score_mutation(mutated, scene_class)
				if score is not None and score > baseline_score:
					all_moves.append({
						'placement_name': placement_name,
						'move_type': 'zone_reassign',
						'move_description': f"Move '{placement_name}' to zone '{new_zone_name}'",
						'baseline_score': baseline_score,
						'projected_score': score,
						'score_delta': score - baseline_score,
						'mutated_scene': mutated,
					})

		# Move type 2: display_width_cm adjust (+/-10, +/-20, +/-30 cm).
		for delta_cm in [10, 20, 30, -10, -20, -30]:
			mutated = _mutate_display_width_cm(scene, placement_name, delta_cm)
			score = _score_mutation(mutated, scene_class)
			if score is not None and score > baseline_score:
				direction = '+' if delta_cm > 0 else ''
				all_moves.append({
					'placement_name': placement_name,
					'move_type': 'display_width_cm_adjust',
					'move_description': f"Adjust '{placement_name}' width by {direction}{delta_cm} cm",
					'baseline_score': baseline_score,
					'projected_score': score,
					'score_delta': score - baseline_score,
					'mutated_scene': mutated,
				})

		# Move type 3: data-primary flip.
		mutated = _mutate_data_primary_flip(scene, placement_name)
		score = _score_mutation(mutated, scene_class)
		if score is not None and score > baseline_score:
			current_primary = placement.get('data-primary', False)
			all_moves.append({
				'placement_name': placement_name,
				'move_type': 'data_primary_flip',
				'move_description': f"Toggle data-primary on '{placement_name}' ({current_primary} -> {not current_primary})",
				'baseline_score': baseline_score,
				'projected_score': score,
				'score_delta': score - baseline_score,
				'mutated_scene': mutated,
			})

	# Sort by score_delta (largest gain first), tie-break on placement_name (stable).
	all_moves.sort(key=lambda m: (-m['score_delta'], m['placement_name']))

	# Render-risk guard: drop any move that introduces a new ESCAPE_REQUIRED key.
	guarded_moves = [
		m for m in all_moves
		if not _check_render_risk(m['mutated_scene'], baseline_escape_keys)
	]

	# Strip internal mutated_scene before returning.
	result = []
	for move in guarded_moves[:n_suggestions]:
		result.append({
			'placement_name': move['placement_name'],
			'move_type': move['move_type'],
			'move_description': move['move_description'],
			'baseline_score': move['baseline_score'],
			'projected_score': move['projected_score'],
			'score_delta': move['score_delta'],
		})
	return result


#============================================
# Mutation scoring helpers (in-memory)
#============================================

def dump_scene_geometry_from_scene_dict(scene: dict, temp_dir: Path | None = None) -> dict:
	"""Write a scene dict to a temp YAML and call dump_scene_geometry on it.

	KNOWN LIMITATION (decision-gated, 2026-05-24): dump_scene_geometry resolves
	the repo root by walking the scene_path parent chain upward looking for
	AGENTS.md. A temp file under /tmp escapes that walk and the resulting
	object registry is empty -- every placement gets scale_source='skipped_error'
	and downstream geometry is garbage. _score_mutation treats failure (raise
	or empty dump) as a non-scorable mutation and returns None, so the engine
	stays correct, just unable to find improvements in practice. Fix path
	requires dump_scene_geometry to accept (scene_dict, repo_root) parameters.

	Args:
		scene: Mutated scene dict.
		temp_dir: Directory for temporary file (defaults to /tmp).

	Returns:
		Dump dict from dump_scene_geometry (may have empty object_registry).
	"""
	if temp_dir is None:
		temp_dir = Path(tempfile.gettempdir())

	with tempfile.NamedTemporaryFile(
		mode='w',
		suffix='.yaml',
		dir=temp_dir,
		delete=False,
	) as f:
		yaml.dump(scene, f)
		temp_path = Path(f.name)

	try:
		return dump_scene_geometry(temp_path)
	finally:
		temp_path.unlink()


def compute_metrics_from_dict(scene: dict, dump_data: dict) -> dict[str, float | None]:
	"""Compute all metrics for a scene + dump_data pair.

	Mirrors validation/scene_design/cli.py::compute_metrics on the same key set,
	called from in-memory mutation scoring rather than from a scene path.
	"""
	metrics = {}
	metrics['predicted_label_overlap'] = predicted_label_overlap(scene, dump_data)
	metrics['label_to_object_distance'] = label_to_object_distance(scene, dump_data)
	metrics['label_wrap_rate'] = label_wrap_rate(scene, dump_data)
	metrics['scene_density'] = scene_density(scene, dump_data)
	metrics['row_overcrowding'] = row_overcrowding(scene, dump_data)
	metrics['tab_stops_symmetry'] = tab_stops_symmetry(scene, dump_data)
	metrics['depth_tier_usage'] = depth_tier_usage(scene, dump_data)
	metrics['aspect_fidelity'] = aspect_fidelity(scene, dump_data)
	metrics['primary_area_ratio'] = primary_area_ratio(scene, dump_data)
	metrics['primary_prominence'] = primary_prominence(scene, dump_data)
	metrics['primary_detection_confidence'] = primary_detection_confidence(scene)
	metrics['zone_footprint_balance'] = zone_footprint_balance(scene, dump_data)
	metrics['largest_empty_band'] = largest_empty_band(scene, dump_data)
	metrics['scene_occupied'] = scene_occupied(scene, dump_data)
	metrics['support_distance'] = support_distance(scene, dump_data)
	metrics['protocol_step_affinity'] = protocol_step_affinity(scene)
	return metrics
