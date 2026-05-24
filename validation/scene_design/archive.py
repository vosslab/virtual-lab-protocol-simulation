"""Archive writer and reader for scene design scorecard history.

Manages append-only JSONL history file tracking scene design scores over time.
Write side fires on every scene_design CLI invocation. Read side exposes
load_history() for quarterly report generation and score lookups.

Row schema:
	{
		"run_id": "<ISO-8601 timestamp>",
		"date_utc": "<YYYY-MM-DD>",
		"scene": "<scene_name>",
		"class": "<scene_class>",
		"score": <float>,
		"metric_values": {...}
	}
"""

import json
from pathlib import Path
from datetime import datetime, timezone


def append_history_row(
	scene_name: str,
	scene_class: str,
	score: float,
	metric_values: dict,
	history_path: Path,
) -> None:
	"""
	Append one JSON line to scorecard history file.

	Creates parent directory if missing. Appends one row per scene with
	run_id computed as current UTC timestamp (ISO-8601, seconds precision).

	Args:
		scene_name: Scene name string.
		scene_class: Detected scene class (template, composition, etc.).
		score: Design score (0-100 float).
		metric_values: Dict of computed metrics.
		history_path: Path to JSONL history file (created if missing).

	Returns:
		None. Side effect: appends one line to history_path.
	"""
	history_path.parent.mkdir(parents=True, exist_ok=True)

	run_id = datetime.now(timezone.utc).isoformat(timespec='seconds')
	date_utc = datetime.now(timezone.utc).strftime('%Y-%m-%d')

	row = {
		'run_id': run_id,
		'date_utc': date_utc,
		'scene': scene_name,
		'class': scene_class,
		'score': score,
		'metric_values': metric_values,
	}

	with open(history_path, 'a') as f:
		json.dump(row, f, separators=(',', ':'))
		f.write('\n')


def load_history(history_path: Path) -> list[dict]:
	"""
	Load scorecard history from JSONL file.

	Reads line-delimited JSON. Tolerates missing file by returning empty list.
	Raises on malformed JSON line (no silent skip).

	Args:
		history_path: Path to JSONL history file.

	Returns:
		List of dicts (one per JSON line), or [] if file missing.

	Raises:
		json.JSONDecodeError if any line contains invalid JSON.
	"""
	if not history_path.exists():
		return []

	rows = []
	with open(history_path, 'r') as f:
		for line_num, line in enumerate(f, start=1):
			line = line.rstrip('\n')
			if not line:
				continue
			try:
				row = json.loads(line)
			except json.JSONDecodeError as e:
				raise json.JSONDecodeError(
					f'Line {line_num}: {e.msg}',
					e.doc,
					e.pos,
				)
			rows.append(row)

	return rows


def score_for_run(
	history: list[dict],
	scene: str,
	run_id: str,
) -> float | None:
	"""
	Return score for a given scene at a given run_id.

	Args:
		history: List of history rows from load_history().
		scene: Scene name to look up.
		run_id: Run ID (ISO-8601 timestamp) to match.

	Returns:
		Score float if found, None if not present.
	"""
	for row in history:
		if row['scene'] == scene and row['run_id'] == run_id:
			return row['score']
	return None


def score_quarter_range(
	history: list[dict],
	scene: str,
	start_date: str,
	end_date: str,
) -> list[dict]:
	"""
	Return rows for a scene whose date_utc falls in [start_date, end_date].

	Args:
		history: List of history rows from load_history().
		scene: Scene name to filter by.
		start_date: Start date as 'YYYY-MM-DD' (inclusive).
		end_date: End date as 'YYYY-MM-DD' (inclusive).

	Returns:
		List of matching history rows, ordered as they appear in history.
	"""
	result = []
	for row in history:
		if row['scene'] == scene:
			if start_date <= row['date_utc'] <= end_date:
				result.append(row)
	return result
