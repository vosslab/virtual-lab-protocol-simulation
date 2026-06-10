#!/usr/bin/env python3
"""
E2E parity report: normalize_svg_v2 vs normalize_svg_v3 on the 102 committed assets (WP-4b).

For each committed *.svg tracked by git:
  - Run v2 -> record its viewBox output (v2 always normalizes; no rejection).
  - Run v3 -> record its viewBox (if normalized) OR its rejection reason code.

Flags:
  (a) Assets v3 REJECTS that v2 "normalized" -- these need author fixes before ingestion.
  (b) Transform-bearing assets whose viewBox changed between v2 and v3 (crop shifted).

Writes two output artifacts:
  docs/active_plans/reports/normalize_svg_v3_parity.json
  docs/active_plans/reports/normalize_svg_v3_parity.md

This script does NOT modify any source asset. All normalization runs into a temp dir.

Run with:
  source source_me.sh && python3 tests/e2e/e2e_normalize_svg_parity.py
"""

# Standard Library
import sys
import json
import time
import tempfile
import traceback
import subprocess
from pathlib import Path

# Resolve repo root via git so this script works from any working directory.
_GIT_RESULT = subprocess.run(
	["git", "rev-parse", "--show-toplevel"],
	capture_output=True,
	text=True,
	check=True,
)
REPO_ROOT = Path(_GIT_RESULT.stdout.strip())

# Add tools/ to sys.path so both normalizers can be imported without install.
_TOOLS_DIR = REPO_ROOT / "tools"
sys.path.insert(0, str(_TOOLS_DIR))

import normalize_svg_v2
import normalize_svg_v3

REPORTS_DIR = REPO_ROOT / "docs" / "active_plans" / "reports"
JSON_REPORT = REPORTS_DIR / "normalize_svg_v3_parity.json"
MD_REPORT = REPORTS_DIR / "normalize_svg_v3_parity.md"


#============================================
def collect_committed_svg_paths() -> list[Path]:
	"""Return sorted list of *.svg paths tracked by git in the repo.

	Uses git ls-files to get only tracked SVGs (not untracked or ignored ones).

	Returns:
		Sorted list of absolute paths to committed SVG files.
	"""
	result = subprocess.run(
		["git", "ls-files", "*.svg"],
		capture_output=True,
		text=True,
		check=True,
		cwd=REPO_ROOT,
	)
	paths: list[Path] = []
	for line in result.stdout.strip().splitlines():
		if line.strip():
			paths.append(REPO_ROOT / line.strip())
	paths.sort()
	return paths


#============================================
def has_transform(svg_path: Path) -> bool:
	"""Return True if the SVG file contains any transform= attribute.

	Does a simple text scan for 'transform=' -- this is fast and sufficient
	for the parity report's transform-asset flag.

	Args:
		svg_path: Path to the SVG file.

	Returns:
		True if 'transform=' appears in the file text.
	"""
	text = svg_path.read_text(encoding="utf-8", errors="replace")
	return "transform=" in text


#============================================
def run_v2(svg_path: Path, out_dir: Path) -> dict:
	"""Run v2 on one SVG and return a result record.

	v2 always normalizes (no rejection path). On an unexpected crash the result
	records the traceback for diagnosis.

	Args:
		svg_path: Source SVG path.
		out_dir: Temp directory for v2 output.

	Returns:
		Dict with v2_viewbox, v2_normalized (bool), v2_error (str or None).
	"""
	out_path = out_dir / ("v2__" + svg_path.parent.name + "__" + svg_path.name)
	v2_viewbox = None
	v2_normalized = False
	v2_error = None

	try:
		_bbox, viewbox = normalize_svg_v2.normalize_svg_file(svg_path, out_path, padding=2.0)
		v2_viewbox = viewbox
		v2_normalized = True
	except Exception:
		v2_error = traceback.format_exc()

	return {
		"v2_viewbox": v2_viewbox,
		"v2_normalized": v2_normalized,
		"v2_error": v2_error,
	}


#============================================
def run_v3(svg_path: Path, out_dir: Path) -> dict:
	"""Run v3 on one SVG and return a result record.

	v3 either normalizes (records the viewBox from the output) or rejects
	(records the reason code and message). Unhandled crashes are recorded
	as unclassified.

	Args:
		svg_path: Source SVG path.
		out_dir: Temp directory for v3 output.

	Returns:
		Dict with v3_normalized, v3_viewbox, v3_rejection_code, v3_message, v3_error.
	"""
	out_path = out_dir / ("v3__" + svg_path.parent.name + "__" + svg_path.name)
	v3_normalized = False
	v3_viewbox = None
	v3_rejection_code = None
	v3_message = None
	v3_error = None

	try:
		result = normalize_svg_v3.normalize_svg_file(svg_path, out_path, padding=2.0)
		if result.normalized:
			v3_normalized = True
			# Read the output to extract the actual viewBox written by v3.
			if out_path.exists():
				v3_text = out_path.read_text(encoding="utf-8")
				# Extract viewBox from serialized output -- look for viewBox="..."
				import re
				m = re.search(r'viewBox="([^"]+)"', v3_text)
				if m:
					v3_viewbox = m.group(1)
		else:
			rejection = result.rejection
			v3_rejection_code = rejection.code
			v3_message = rejection.message
	except Exception:
		v3_error = traceback.format_exc()

	return {
		"v3_normalized": v3_normalized,
		"v3_viewbox": v3_viewbox,
		"v3_rejection_code": v3_rejection_code,
		"v3_message": v3_message,
		"v3_error": v3_error,
	}


#============================================
def viewbox_changed(v2_vb: str | None, v3_vb: str | None, tol: float = 0.05) -> bool:
	"""Return True if the viewBox values differ beyond a floating-point tolerance.

	Compares the four numeric components of a "x y w h" viewBox string.
	Returns True if any component differs by more than tol (in user units).

	Args:
		v2_vb: v2 viewBox string or None.
		v3_vb: v3 viewBox string or None.
		tol: Absolute tolerance in user units. Default 0.05.

	Returns:
		True if viewBoxes differ materially.
	"""
	if v2_vb is None or v3_vb is None:
		return v2_vb != v3_vb
	try:
		v2_parts = [float(x) for x in v2_vb.split()]
		v3_parts = [float(x) for x in v3_vb.split()]
		if len(v2_parts) != 4 or len(v3_parts) != 4:
			return True
		return any(abs(a - b) > tol for a, b in zip(v2_parts, v3_parts))
	except ValueError:
		return True


#============================================
def build_markdown_report(records: list[dict], elapsed: float) -> str:
	"""Build a Markdown parity report from per-file records.

	Args:
		records: Per-file result dicts.
		elapsed: Total wall-clock seconds.

	Returns:
		Markdown text as a string.
	"""
	total = len(records)
	v3_normalized = sum(1 for r in records if r["v3_normalized"])
	v3_rejected = sum(1 for r in records if r["v3_rejection_code"] is not None)
	v3_crashes = sum(1 for r in records if r["v3_error"] is not None)

	# Assets that v2 passed but v3 rejects (the action items).
	new_rejects = [r for r in records if r["v2_normalized"] and not r["v3_normalized"] and r["v3_rejection_code"]]

	# Transform-bearing assets with viewBox change.
	transform_changed = [r for r in records if r["has_transform"] and viewbox_changed(r["v2_viewbox"], r["v3_viewbox"])]

	# Group new rejects by reason code.
	reject_by_code: dict[str, list[dict]] = {}
	for rec in new_rejects:
		code = rec["v3_rejection_code"]
		reject_by_code.setdefault(code, []).append(rec)

	lines: list[str] = []
	lines.append("# SVG Normalizer v3 parity report")
	lines.append("")
	lines.append("Compares normalize_svg_v2 vs normalize_svg_v3 on all 102 committed SVG assets.")
	lines.append("Generated by `tests/e2e/e2e_normalize_svg_parity.py` (WP-4b).")
	lines.append("Reflects the FINAL normalizer (WP-1a..3e + gradient/visibility fix).")
	lines.append("")
	lines.append("## Summary")
	lines.append("")
	lines.append(f"- Total committed SVG assets: {total}")
	lines.append(f"- v3 normalizes: {v3_normalized}")
	lines.append(f"- v3 rejects: {v3_rejected}")
	lines.append(f"- v3 unclassified crashes: {v3_crashes}")
	lines.append(f"- v2-passed but v3-rejects (need author fixes): {len(new_rejects)}")
	lines.append(f"- Transform assets with viewBox change: {len(transform_changed)}")
	lines.append(f"- Elapsed: {elapsed:.1f}s")
	lines.append("")

	if new_rejects:
		lines.append("## Assets v3 rejects that v2 normalized (action items)")
		lines.append("")
		lines.append("These assets are currently in the repo but would be rejected at ingestion.")
		lines.append("They require author fixes before v3 ingestion can proceed.")
		lines.append("")
		for code, recs in sorted(reject_by_code.items()):
			lines.append(f"### Rejection code: `{code}` ({len(recs)} assets)")
			lines.append("")
			for rec in recs:
				lines.append(f"- `{rec['rel_path']}`")
				if rec["v3_message"]:
					lines.append(f"  - message: {rec['v3_message']}")
			lines.append("")

	if transform_changed:
		lines.append("## Transform-bearing assets with viewBox change (crop shifted)")
		lines.append("")
		lines.append("These assets have `transform=` attributes; v3 flattens transforms which")
		lines.append("changes the crop compared to v2. The viewBox delta is flagged for review.")
		lines.append("")
		lines.append("| Asset | v2 viewBox | v3 viewBox |")
		lines.append("| --- | --- | --- |")
		for rec in transform_changed:
			v2_vb = rec["v2_viewbox"] or "n/a"
			v3_vb = rec["v3_viewbox"] or f"REJECTED:{rec['v3_rejection_code']}"
			lines.append(f"| `{rec['rel_path']}` | `{v2_vb}` | `{v3_vb}` |")
		lines.append("")

	lines.append("## Transform-bearing assets (full list)")
	lines.append("")
	lines.append("Assets containing `transform=` attributes:")
	lines.append("")
	transform_assets = [r for r in records if r["has_transform"]]
	for rec in transform_assets:
		lines.append(f"- `{rec['rel_path']}` -- v3: {('normalized' if rec['v3_normalized'] else 'REJECTED:' + (rec['v3_rejection_code'] or 'crash'))}")
	lines.append("")

	if v3_crashes > 0:
		lines.append("## Unclassified crashes (gate failures)")
		lines.append("")
		for rec in records:
			if rec["v3_error"]:
				lines.append(f"- `{rec['rel_path']}`")
				lines.append("")
				lines.append("  ```")
				for tb_line in rec["v3_error"].strip().splitlines():
					lines.append(f"  {tb_line}")
				lines.append("  ```")
				lines.append("")

	lines.append("## Per-file details")
	lines.append("")
	lines.append("| Asset | v2 viewBox | v3 result | transform |")
	lines.append("| --- | --- | --- | --- |")
	for rec in records:
		v2_vb = rec["v2_viewbox"] or "ERROR"
		if rec["v3_normalized"]:
			v3_result = f"normalized ({rec['v3_viewbox']})"
		elif rec["v3_rejection_code"]:
			v3_result = f"REJECTED:{rec['v3_rejection_code']}"
		else:
			v3_result = "CRASH"
		has_t = "yes" if rec["has_transform"] else "-"
		lines.append(f"| `{rec['rel_path']}` | `{v2_vb}` | {v3_result} | {has_t} |")
	lines.append("")

	return "\n".join(lines)


#============================================
def main() -> int:
	"""Run parity check on all committed SVGs; write reports; exit 0 or 1.

	Returns:
		0 on success (even if v3 rejects some assets -- rejections are expected).
		1 if any v3 unclassified crash occurs (a bug in v3) or if git ls-files fails.
	"""
	svg_paths = collect_committed_svg_paths()
	if not svg_paths:
		print("ERROR: no committed *.svg files found via git ls-files", file=sys.stderr)
		return 1

	print(f"Parity runner: {len(svg_paths)} committed SVG assets")

	start_time = time.time()
	records: list[dict] = []
	crash_count = 0

	with tempfile.TemporaryDirectory(prefix="normalize-svg-v3-parity-") as tmp_str:
		out_dir = Path(tmp_str)
		for idx, svg_path in enumerate(svg_paths):
			rel_path = str(svg_path.relative_to(REPO_ROOT))
			# Progress output every 20 files for a manageable run.
			if idx > 0 and idx % 20 == 0:
				elapsed_so_far = time.time() - start_time
				print(f"  [{idx}/{len(svg_paths)}] {elapsed_so_far:.1f}s elapsed ...")

			has_t = has_transform(svg_path)
			v2_rec = run_v2(svg_path, out_dir)
			v3_rec = run_v3(svg_path, out_dir)

			record: dict = {
				"rel_path": rel_path,
				"has_transform": has_t,
			}
			record.update(v2_rec)
			record.update(v3_rec)

			# Flag viewBox change for transform assets that both versions normalized.
			vb_changed = False
			if has_t and v2_rec["v2_normalized"] and v3_rec["v3_normalized"]:
				vb_changed = viewbox_changed(v2_rec["v2_viewbox"], v3_rec["v3_viewbox"])
			record["viewbox_changed"] = vb_changed

			records.append(record)
			if v3_rec["v3_error"] is not None:
				crash_count += 1
				print(f"CRASH (v3): {rel_path}", file=sys.stderr)
				print(v3_rec["v3_error"], file=sys.stderr)

	elapsed = time.time() - start_time

	# Write reports.
	REPORTS_DIR.mkdir(parents=True, exist_ok=True)

	json_text = json.dumps(records, indent=2)
	JSON_REPORT.write_text(json_text, encoding="utf-8")

	md_text = build_markdown_report(records, elapsed)
	MD_REPORT.write_text(md_text, encoding="utf-8")

	# Print headline counts.
	v3_normalized = sum(1 for r in records if r["v3_normalized"])
	v3_rejected = sum(1 for r in records if r["v3_rejection_code"] is not None)
	new_rejects = [r for r in records if r["v2_normalized"] and not r["v3_normalized"] and r["v3_rejection_code"]]
	transform_changed = [r for r in records if r["has_transform"] and r["viewbox_changed"]]
	transform_assets = [r for r in records if r["has_transform"]]

	print(f"\nParity run complete: {len(records)} assets in {elapsed:.1f}s")
	print(f"  v3 normalizes:                   {v3_normalized}")
	print(f"  v3 rejects:                      {v3_rejected}")
	print(f"  v3 unclassified crashes:         {crash_count}")
	print(f"  v2-passed but v3-rejects (action items): {len(new_rejects)}")
	print(f"  transform assets (total):        {len(transform_assets)}")
	print(f"  transform assets viewBox changed: {len(transform_changed)}")

	if new_rejects:
		print("\n  v3-rejects-that-v2-passed breakdown by reason code:")
		code_counts: dict[str, int] = {}
		for rec in new_rejects:
			code = rec["v3_rejection_code"] or "UNKNOWN"
			code_counts[code] = code_counts.get(code, 0) + 1
		for code, count in sorted(code_counts.items(), key=lambda kv: -kv[1]):
			print(f"    {code}: {count}")

	print("\nReports written to:")
	print(f"  {JSON_REPORT}")
	print(f"  {MD_REPORT}")

	if crash_count > 0:
		print(f"\nGATE FAILURE: {crash_count} unclassified v3 crash(es). See report.", file=sys.stderr)
		return 1
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
