"""
Executable verbosity contract shared by all validation stages.

This module is the single source of truth for the quiet/default/verbose
output contract. Every stage resolves its level through this module and
renders its summary line and diagnostic block through these formatters,
so all stages share one canonical shape and a future stage inherits
correct behavior by calling the helpers.

Levels
------
A closed three-value enum, VerbosityLevel, models the contract:

  QUIET   -> one summary line per stage.
  NORMAL  -> stage summary, totals, top categories (the no-flag default).
  VERBOSE -> a grouped diagnostic summary with top offenders.

NORMAL is an explicit returned level, never inferred from raw booleans by
callers. resolve_level maps the existing (quiet, verbose) boolean pair to
the enum; renderers switch on the enum, not on raw booleans. The public
CLI contract stays -q / no-flag / -v; there is no --normal flag.

Canonical summary-line grammar
------------------------------
All stages emit one stable, parseable shape:

  Checked <N> <label>. <F> failures. <W> warnings.

Failures AND warnings are ALWAYS printed, including zero counts, so the
shape is identical across stages and across runs. The tokens
"<F> failures" and "<W> warnings" appear verbatim so the regexes in
validation/validate.py (r"(\\d+)\\s+failures\\b", r"(\\d+)\\s+warnings\\b")
match for color markup. <label> is the stage's item noun (files, objects,
protocols, folders, scenes).

Diagnostic input schema
------------------------
diagnostic_summary takes a single DiagnosticData value with three named,
independently optional sections, each a list of (name_or_code, count)
tuples:

  top_codes        -> diagnostic codes and their counts
  top_offenders    -> offending item names and their counts
  category_counts  -> category names and their counts

A stage supplies only the sections it has; an absent section defaults to
an empty list.

Empty-state behavior
--------------------
- An empty section is omitted entirely: no header, no "none" line.
- When ALL sections are empty, diagnostic_summary emits a single line,
  "No diagnostics.", so verbose never collapses to zero lines.

Sort order and truncation
--------------------------
Each section sorts by count descending, then by name ascending for stable
ties, and is deterministic for identical inputs. Each section truncates to
the top TOP_K = 10 entries; when a section has more than TOP_K entries, a
trailing "... and M more" line reports the remainder.
"""

import enum
import dataclasses


# Maximum entries rendered per diagnostic section before truncation.
TOP_K = 10


#============================================
class VerbosityLevel(enum.Enum):
	"""Closed set of output verbosity levels."""

	QUIET = "quiet"
	NORMAL = "normal"
	VERBOSE = "verbose"


#============================================
@dataclasses.dataclass
class DiagnosticData:
	"""
	Input schema for diagnostic_summary.

	Each field is an independently optional section: a list of
	(name_or_code, count) tuples. An absent section defaults to empty.
	"""

	top_codes: list = dataclasses.field(default_factory=list)
	top_offenders: list = dataclasses.field(default_factory=list)
	category_counts: list = dataclasses.field(default_factory=list)


#============================================
def resolve_level(*, quiet: bool, verbose: bool) -> VerbosityLevel:
	"""
	Resolve the (quiet, verbose) boolean pair to a VerbosityLevel.

	Args:
		quiet: True when -q/--quiet was requested.
		verbose: True when -v/--verbose was requested.

	Returns:
		QUIET if quiet, VERBOSE if verbose, otherwise NORMAL.

	Raises:
		ValueError: when both quiet and verbose are True. The argparse
			group already enforces mutual exclusion at the CLI; this guard
			keeps the helper durable when called directly from tests or
			future code.
	"""
	# Reject the contradictory combination loudly rather than guessing.
	if quiet and verbose:
		raise ValueError("quiet and verbose are mutually exclusive")
	if quiet:
		return VerbosityLevel.QUIET
	if verbose:
		return VerbosityLevel.VERBOSE
	# NORMAL is an explicit level, not the absence of the other two.
	return VerbosityLevel.NORMAL


#============================================
def summary_line(total: int, failures: int, *,
		item_label: str = "items", warnings: int = 0) -> str:
	"""
	Build the canonical stage summary line.

	Args:
		total: number of items the stage checked.
		failures: number of failures found.
		item_label: the stage's item noun (files, objects, protocols, ...).
		warnings: number of warnings found.

	Returns:
		"Checked <N> <label>. <F> failures. <W> warnings." with both the
		failures and warnings counts always present, including zeros.
	"""
	# Always emit both counts so the shape is identical across stages.
	line = f"Checked {total} {item_label}. {failures} failures. {warnings} warnings."
	return line


#============================================
def _render_section(header: str, entries: list) -> list:
	"""
	Render one diagnostic section to a list of output lines.

	Sorts by count descending then name ascending, truncates to TOP_K, and
	appends a "... and M more" line when entries exceed TOP_K. Returns an
	empty list when the section has no entries.
	"""
	# Omit empty sections entirely: no header, no "none" line.
	if not entries:
		return []
	# Sort by count descending, then name ascending for stable ties.
	sorted_entries = sorted(entries, key=lambda pair: (-pair[1], pair[0]))
	lines = [header]
	# Render up to TOP_K entries.
	shown = sorted_entries[:TOP_K]
	for name, count in shown:
		lines.append(f"  {name}: {count}")
	# Report any remainder beyond the top-K cutoff.
	remainder = len(sorted_entries) - len(shown)
	if remainder > 0:
		lines.append(f"  ... and {remainder} more")
	return lines


#============================================
def diagnostic_summary(data: DiagnosticData) -> str:
	"""
	Render the grouped diagnostic block for VERBOSE output.

	Args:
		data: a DiagnosticData carrying the optional sections.

	Returns:
		A possibly multi-line string. Each non-empty section is rendered
		with a header, its top-K entries sorted by count then name, and a
		"... and M more" line when truncated. When every section is empty,
		returns the single line "No diagnostics." so verbose never
		collapses to zero lines. The caller decides whether to print it.
	"""
	lines = []
	# Render each named section in a fixed, deterministic order.
	lines.extend(_render_section("Top codes:", data.top_codes))
	lines.extend(_render_section("Top offenders:", data.top_offenders))
	lines.extend(_render_section("Category counts:", data.category_counts))
	# Guarantee at least one line when all sections are empty.
	if not lines:
		return "No diagnostics."
	block = "\n".join(lines)
	return block
