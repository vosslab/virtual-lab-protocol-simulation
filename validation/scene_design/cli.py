"""Scene design lint CLI and main entry point."""

import sys
import json
import argparse
from pathlib import Path

from validation.shared_toolkit.yaml_io import load_yaml
import validation.shared_toolkit.verbosity as verbosity
import validation.shared_toolkit.reporter as reporter
from validation.scene_design.class_detect import detect, SceneClassError
from validation.scene_design.cards import SceneCard, write_cards_jsonl, write_cards_markdown
from validation.scene_design.archive import append_history_row
from validation.scene_design.score import aggregate_score
from validation.scene_calc.dump import dump_scene_geometry, MissingRenderEvidenceError
import validation.shared_toolkit.cli as toolkit_cli

from validation.scene_design.metrics.labels import (
	predicted_label_overlap,
	label_to_object_distance,
	label_wrap_rate,
)
from validation.scene_design.metrics.density import (
	scene_density,
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


def _add_scene_design_extras(parser: argparse.ArgumentParser) -> None:
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


def parse_args() -> argparse.Namespace:
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

	# Composition metrics
	metrics['tab_stops_symmetry'] = tab_stops_symmetry(scene, dump_data) if dump_data else None
	metrics['depth_tier_usage'] = depth_tier_usage(scene, dump_data) if dump_data else None
	metrics['aspect_fidelity'] = aspect_fidelity(scene, dump_data) if dump_data else None

	# Hierarchy metrics
	metrics['primary_area_ratio'] = primary_area_ratio(scene, dump_data) if dump_data else None
	metrics['primary_prominence'] = primary_prominence(scene, dump_data) if dump_data else None
	metrics['primary_detection_confidence'] = primary_detection_confidence(scene)

	# Balance metrics
	metrics['largest_empty_band'] = largest_empty_band(scene, dump_data) if dump_data else None
	metrics['scene_occupied'] = scene_occupied(scene, dump_data) if dump_data else None

	# Proximity metrics
	metrics['support_distance'] = support_distance(scene, dump_data) if dump_data else None
	metrics['protocol_step_affinity'] = protocol_step_affinity(scene)

	return metrics


#============================================
# Text rendering (verbosity-gated)
#============================================

# Number of lowest-scoring cards shown in NORMAL text mode.
NORMAL_TOP_CARDS = 10


def count_scoring_failures(cards: list[SceneCard]) -> int:
	"""
	Count cards whose aggregate score could not be computed.

	scene_design is advisory and never fails on design quality, so the only
	"failure" the canonical summary reports is a scoring failure: a card whose
	score is None because a required metric was missing (partial dump). This
	keeps the exit code at the advisory baseline (0) and avoids inventing an
	arbitrary pass/fail quality threshold.
	"""
	failures = sum(1 for card in cards if card.score is None)
	return failures


def render_normal_lines(cards: list[SceneCard]) -> list[str]:
	"""
	Render NORMAL text mode: totals plus the lowest-scoring cards.

	Full per-card metric detail goes to --json / --ndjson, not text. Cards
	with a None score sort first (treated as lowest) so scoring failures are
	surfaced at the top.
	"""
	lines: list[str] = []
	# Sort ascending by score; None scores sort first as the worst case.
	def sort_key(card: SceneCard) -> tuple:
		# None -> (0, 0.0) sorts before any real score (1, score).
		if card.score is None:
			return (0, 0.0)
		return (1, card.score)
	ranked = sorted(cards, key=sort_key)
	shown = ranked[:NORMAL_TOP_CARDS]
	lines.append(f"Lowest-scoring scenes (showing {len(shown)} of {len(cards)}):")
	for card in shown:
		# Render the score with a fixed shape; None becomes an explicit token.
		score_text = "n/a" if card.score is None else f"{card.score:.1f}"
		lines.append(f"  {card.scene} [{card.scene_class}]: {score_text} ({card.confidence})")
	return lines


def build_diagnostic_data(cards: list[SceneCard]) -> verbosity.DiagnosticData:
	"""
	Build the VERBOSE diagnostic block input for scene_design.

	Per the stage contract table, scene_design VERBOSE supplies:
	  top_offenders   -> lowest-scoring scenes (worst design scores first)
	  category_counts -> cards grouped by detected scene class
	"""
	# top_offenders: lowest score is the worst offender. diagnostic_summary
	# sorts by count descending, so invert the score into a magnitude where a
	# lower score yields a larger displayed number. A None score maps to the
	# maximum magnitude (100) so unscored cards lead the list.
	offenders: list = []
	for card in cards:
		if card.score is None:
			magnitude = 100
		else:
			# Round so the displayed integer is stable and deterministic.
			magnitude = round(100 - card.score)
		offenders.append((card.scene, magnitude))

	# category_counts: number of cards per detected scene class.
	class_counts: dict = {}
	for card in cards:
		class_counts[card.scene_class] = class_counts.get(card.scene_class, 0) + 1
	category_counts = [(name, count) for name, count in class_counts.items()]

	data = verbosity.DiagnosticData(
		top_offenders=offenders,
		category_counts=category_counts,
	)
	return data


def render_cards_text(cards: list[SceneCard], level: verbosity.VerbosityLevel) -> None:
	"""
	Render cards as human text gated by verbosity level.

	QUIET   : exactly one canonical summary line.
	NORMAL  : summary line plus the lowest-scoring cards.
	VERBOSE : NORMAL plus the grouped diagnostic block.
	"""
	total = len(cards)
	failures = count_scoring_failures(cards)

	# QUIET: exactly one canonical summary line, nothing else.
	if level is verbosity.VerbosityLevel.QUIET:
		reporter.print_summary_line(total, failures, item_label="scenes")
		return

	# NORMAL and VERBOSE both begin with the canonical summary line.
	reporter.print_summary_line(total, failures, item_label="scenes")
	for line in render_normal_lines(cards):
		print(line)

	# VERBOSE appends the grouped diagnostic block.
	if level is verbosity.VerbosityLevel.VERBOSE:
		data = build_diagnostic_data(cards)
		block = verbosity.diagnostic_summary(data)
		print(block)


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
		except MissingRenderEvidenceError:
			# Render-evidence prerequisite failure: the per-scene stats.json is
			# missing or load-failed. This is a hard prerequisite, not an advisory
			# partial: fail the stage with a precise message naming the fix
			# command. Validation never renders; rendering is a separate explicit
			# step (node tools/scene_to_png.mjs --all).
			print(
				"SCENE-DESIGN blocked: rendered scene stats are missing.\n"
				"Generate render evidence first:\n"
				"  node tools/scene_to_png.mjs --all",
				file=sys.stderr,
			)
			sys.exit(1)
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

	# Format dispatch comes FIRST and is orthogonal to verbosity. When any
	# explicit output-format flag is set, the human-text path is bypassed and
	# verbosity does not gate the format. Advisory only: never exit 1 here.
	if args.markdown_output:
		# Markdown is a format, never folded into -v.
		sys.stdout.write(write_cards_markdown(cards))
		return
	if args.output_format == 'json':
		# Single JSON document so aggregate --json (validate.py) can json.loads
		# the whole stdout, matching the other stages instead of crashing on
		# multi-line JSONL.
		document = {'cards': [card.to_dict() for card in cards]}
		sys.stdout.write(json.dumps(document, separators=(',', ':')) + '\n')
		return
	if args.output_format == 'ndjson':
		# Newline-delimited JSON: one card per line (the legacy machine shape).
		sys.stdout.write(write_cards_jsonl(cards))
		return

	# Text mode: resolve the verbosity level once and render accordingly.
	level = verbosity.resolve_level(quiet=args.quiet, verbose=args.verbose)
	render_cards_text(cards, level)


if __name__ == '__main__':
	main()
