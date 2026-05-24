"""Scene design lint CLI and main entry point."""

import sys
from pathlib import Path

from validation.shared_toolkit.yaml_io import load_yaml
from validation.scene_design.class_detect import detect, SceneClassError
from validation.scene_design.cards import SceneCard, write_cards_jsonl, write_cards_markdown
from validation.scene_design.archive import append_history_row
from validation.scene_design.score import aggregate_score
from validation.scene_calc.dump import dump_scene_geometry
import validation.shared_toolkit.cli as toolkit_cli

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
# CLI argparse glue
#============================================


def _add_scene_design_extras(parser):
	"""Register scene_design-specific flags beyond the shared flag set."""
	parser.add_argument(
		'-m', '--markdown',
		dest='markdown_output',
		action='store_true',
		help='Output as Markdown format instead of JSON lines',
	)
	parser.add_argument(
		'--no-history',
		dest='no_history',
		action='store_true',
		help='Skip writing scorecard history (useful for dry runs and tests)',
	)


def parse_args():
	"""Parse command-line arguments for scene_design."""
	parser = toolkit_cli.build_parser(
		prog='scene_design',
		description='Scene design lint: composition scorecard generator for scene YAML.',
		extras=_add_scene_design_extras,
	)
	args = parser.parse_args()
	return args


def resolve_paths(path_specs: list[str]) -> list[Path]:
	"""
	Resolve path specs (file paths and globs) to concrete YAML files.
	Raises RuntimeError if any spec yields no files or points to a missing directory.
	"""
	resolved: list[Path] = []
	for spec in path_specs:
		spec_path = Path(spec)
		if '*' in spec or '?' in spec:
			matches = list(Path.cwd().glob(spec))
			if not matches:
				raise RuntimeError(f'Glob pattern matched no files: {spec}')
			resolved.extend(sorted(matches))
		else:
			if not spec_path.exists():
				raise RuntimeError(f'Path does not exist: {spec}')
			if spec_path.is_dir():
				raise RuntimeError(f'Path is a directory, not a YAML file: {spec}')
			resolved.append(spec_path)
	return resolved


#============================================
# Metrics composition
#============================================

def compute_metrics(scene: dict, dump_data: dict | None) -> dict:
	"""
	Compute all design metrics for a scene.

	Calls each metric function with the scene and dump_data. Metrics that
	require dump_data return None when dump_data is None.

	Args:
		scene: Parsed scene YAML dict.
		dump_data: Dump dict from dump_scene_geometry, or None if dump failed.

	Returns:
		Dict mapping metric name -> float | None.
	"""
	metrics = {}

	# Label metrics
	metrics['predicted_label_overlap'] = predicted_label_overlap(scene, dump_data) if dump_data else None
	metrics['label_to_object_distance'] = label_to_object_distance(scene, dump_data) if dump_data else None
	metrics['label_wrap_rate'] = label_wrap_rate(scene, dump_data) if dump_data else None

	# Density metrics
	metrics['scene_density'] = scene_density(scene, dump_data) if dump_data else None
	metrics['row_overcrowding'] = row_overcrowding(scene, dump_data) if dump_data else None

	# Composition metrics
	metrics['tab_stops_symmetry'] = tab_stops_symmetry(scene, dump_data) if dump_data else None
	metrics['depth_tier_usage'] = depth_tier_usage(scene, dump_data) if dump_data else None
	metrics['aspect_fidelity'] = aspect_fidelity(scene, dump_data) if dump_data else None

	# Hierarchy metrics
	metrics['primary_area_ratio'] = primary_area_ratio(scene, dump_data) if dump_data else None
	metrics['primary_prominence'] = primary_prominence(scene, dump_data) if dump_data else None
	metrics['primary_detection_confidence'] = primary_detection_confidence(scene)

	# Balance metrics
	metrics['zone_footprint_balance'] = zone_footprint_balance(scene, dump_data) if dump_data else None
	metrics['largest_empty_band'] = largest_empty_band(scene, dump_data) if dump_data else None
	metrics['scene_occupied'] = scene_occupied(scene, dump_data) if dump_data else None

	# Proximity metrics
	metrics['support_distance'] = support_distance(scene, dump_data) if dump_data else None
	metrics['protocol_step_affinity'] = protocol_step_affinity(scene)

	return metrics


#============================================
# Main entry
#============================================

def main() -> None:
	"""Main entry point for scene_design."""
	args = parse_args()

	# Scene paths come from -S/--scene (shared flag). Fall back to empty list
	# so standalone invocation without -S gives a useful error.
	path_specs = args.scenes if args.scenes else []
	if not path_specs:
		print('Error: at least one scene path required (use -S/--scene)', file=sys.stderr)
		sys.exit(2)

	try:
		paths = resolve_paths(path_specs)
	except RuntimeError as e:
		print(f'Error: {e}', file=sys.stderr)
		sys.exit(2)

	cards: list[SceneCard] = []

	for path in paths:
		try:
			scene = load_yaml(path)
		except RuntimeError as e:
			print(f'Error loading {path}: {e}', file=sys.stderr)
			sys.exit(1)

		scene_name = scene['scene_name']

		try:
			scene_class = detect(scene)
		except SceneClassError as e:
			print(f'Error detecting class for {scene_name}: {e}', file=sys.stderr)
			sys.exit(1)

		# Attempt to compute dump_data for dump-consuming metrics.
		# Wrap in try/except to handle missing bounds or other errors gracefully.
		dump_data = None
		dump_note = None
		try:
			dump_data = dump_scene_geometry(path)
		except (OSError, RuntimeError, KeyError) as e:
			dump_note = f"Scene geometry dump failed; dump-consuming metrics skipped: {e}"

		# Compute all metrics. Those that need dump_data will return None if dump failed.
		metrics = compute_metrics(scene, dump_data)

		# Aggregate metrics into a single 0-100 score using per-class weights.
		# aggregate_score returns None if any required metric for the class is None.
		score = aggregate_score(metrics, scene_class)

		# Determine confidence and note.
		if dump_note:
			print(f'Note ({scene_name}): {dump_note}', file=sys.stderr)
			confidence = 'partial'
		else:
			confidence = 'computed'

		# Create card with computed metrics + aggregate score.
		card = SceneCard(
			scene=scene_name,
			scene_class=scene_class,
			score=score,
			confidence=confidence,
			gated_by_render_predictor=False,
			metrics=metrics,
			suggestions=[],
		)
		cards.append(card)

		# Write to history archive (unless --no-history is set).
		if not args.no_history:
			history_path = Path('test-results/scene_design/history/scorecard_history.jsonl')
			append_history_row(
				scene_name=scene_name,
				scene_class=scene_class,
				score=score,
				metric_values=metrics,
				history_path=history_path,
			)

	# Emit cards in requested format. Advisory only: never exit 1 on design findings.
	if args.markdown_output:
		output = write_cards_markdown(cards)
	else:
		output = write_cards_jsonl(cards)

	sys.stdout.write(output)


if __name__ == '__main__':
	main()
