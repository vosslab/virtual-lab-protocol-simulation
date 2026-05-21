#!/usr/bin/env python3
"""
PROPOSAL PHASE 1 DRY RUN: Scorecard hardFailCount Extension Preview

This is a PROPOSAL-ONLY helper. It computes both legacy and proposed hardFailCount
to show what Phase 1 would reveal if implemented, WITHOUT modifying canonical files.

Output: experiments/css_native_layout/stress_results/phase1_dryrun_evidence/

Batch 4 Workstream C proposes extending hardFailCount to include:
  - clipped_by_parent (from artwork_integrity checks)
  - aspect_distorted_HF (from artwork_integrity checks, severity=HARD_FAIL only)

Phase 1 design: additive fields, no semantic change to canonical scoring.
  - Compute BOTH legacyHardFailCount (current 4 categories)
  - AND proposedHardFailCount (current 4 + clipped_by_parent + aspect_distorted_HF)
  - Output both side-by-side for user review
  - NO changes to score_layout.mjs, precheck.mjs, render_and_dump.mjs
  - NO changes to any scorecard_*/ output dirs
  - Clearly labeled PROPOSAL ONLY

Workstream E constraint compliance:
  - Only counts hard fails, not full scoring metrics
  - Output not stored under scorecard_*/ paths
  - Not a replacement for canonical scorecard JSON
  - Proposal evidence only
"""

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STRESS_RESULTS = REPO_ROOT / "experiments" / "css_native_layout" / "stress_results"
DRY_RUN_OUTPUT = STRESS_RESULTS / "phase1_dryrun_evidence"


def ensure_output_dir() -> None:
	"""Create output directory if missing."""
	DRY_RUN_OUTPUT.mkdir(parents=True, exist_ok=True)


def load_precheck_json(path: Path) -> dict[str, Any]:
	"""Load a single precheck JSON file."""
	try:
		with open(path, "r") as f:
			return json.load(f)
	except Exception as e:
		print(f"ERROR: Failed to load {path}: {e}")
		return {}


def compute_legacy_hard_fail_count(scene_data: dict[str, Any]) -> int:
	"""
	Compute hardFailCount using current (legacy) definition.
	This is what score_layout.mjs currently uses (lines 332-339).
	"""
	checks = scene_data.get("checks", {})
	count = (
		len(checks.get("clipped_artwork", [])) +
		len(checks.get("off_page", [])) +
		len(checks.get("svg_svg_overlap", [])) +
		len(checks.get("region_overflow", []))
	)
	return count


def compute_proposed_hard_fail_count(scene_data: dict[str, Any]) -> int:
	"""
	Compute hardFailCount using proposed Phase 1 definition.
	Adds clipped_by_parent + aspect_distorted_HF to legacy categories.
	"""
	legacy = compute_legacy_hard_fail_count(scene_data)
	checks = scene_data.get("checks", {})
	integrity = checks.get("artwork_integrity", {})

	# clipped_by_parent is always present in integrity checks (array)
	clipped_by_parent = len(integrity.get("clipped_by_parent", []))

	# aspect_distorted_HF: filter aspect_distorted array by severity === 'HARD_FAIL'
	aspect_distorted_all = integrity.get("aspect_distorted", [])
	aspect_distorted_hf = len([
		item for item in aspect_distorted_all
		if isinstance(item, dict) and item.get("severity") == "HARD_FAIL"
	])

	proposed = legacy + clipped_by_parent + aspect_distorted_hf
	return proposed


def analyze_batch(batch_name: str, batch_dir: Path) -> dict[str, Any]:
	"""
	Analyze all scenes in a batch directory.
	Supports two formats:
	  1. Individual scene JSON files (e.g., batch1)
	  2. Combined visual_audit.json with all scenes (e.g., batch2_n_canonical)
	Returns summary stats and per-scene details.
	"""
	if not batch_dir.exists():
		print(f"WARNING: Batch directory not found: {batch_dir}")
		return {}

	scenes = []
	verdict_changes = 0  # scenes going from hard_fails=0 to hard_fails>0 under proposed

	# Try combined visual_audit.json format first
	visual_audit_path = batch_dir / "visual_audit.json"
	if visual_audit_path.exists():
		combined_data = load_precheck_json(visual_audit_path)
		if "scenes" in combined_data:
			# Combined format: array of scenes
			for scene_data in combined_data["scenes"]:
				scene_name = scene_data.get("scene", "unknown")
				legacy = compute_legacy_hard_fail_count(scene_data)
				proposed = compute_proposed_hard_fail_count(scene_data)

				if legacy == 0 and proposed > 0:
					verdict_changes += 1

				scenes.append({
					"scene": scene_name,
					"legacy_hard_fails": legacy,
					"proposed_hard_fails": proposed,
					"delta": proposed - legacy,
					"verdict_legacy": "FAIL" if legacy > 0 else "PASS",
					"verdict_proposed": "FAIL" if proposed > 0 else "PASS",
					"verdict_change": "0->FAIL" if (legacy == 0 and proposed > 0) else (
						"FAIL->0" if (legacy > 0 and proposed == 0) else "SAME"
					)
				})

	# Fall back to individual scene JSON files
	if not scenes:
		json_files = sorted(batch_dir.glob("*.json"))
		# Filter to exclude summary files like visual_audit.json, sizing_manifest.json
		json_files = [f for f in json_files if f.stem not in ("visual_audit", "sizing_manifest")]

		if not json_files:
			print(f"WARNING: No scene JSON files found in {batch_dir}")
			return {}

		for json_file in json_files:
			scene_data = load_precheck_json(json_file)
			if not scene_data:
				continue

			scene_name = json_file.stem
			legacy = compute_legacy_hard_fail_count(scene_data)
			proposed = compute_proposed_hard_fail_count(scene_data)

			if legacy == 0 and proposed > 0:
				verdict_changes += 1

			scenes.append({
				"scene": scene_name,
				"legacy_hard_fails": legacy,
				"proposed_hard_fails": proposed,
				"delta": proposed - legacy,
				"verdict_legacy": "FAIL" if legacy > 0 else "PASS",
				"verdict_proposed": "FAIL" if proposed > 0 else "PASS",
				"verdict_change": "0->FAIL" if (legacy == 0 and proposed > 0) else (
					"FAIL->0" if (legacy > 0 and proposed == 0) else "SAME"
				)
			})

	if not scenes:
		return {}

	# Sort by proposed hard fails (descending) for impact visibility
	scenes.sort(key=lambda x: (-x["proposed_hard_fails"], x["scene"]))

	return {
		"batch": batch_name,
		"scene_count": len(scenes),
		"verdict_change_count": verdict_changes,
		"verdict_changes_pct": round(100.0 * verdict_changes / len(scenes), 1) if scenes else 0.0,
		"legacy_median": compute_median([s["legacy_hard_fails"] for s in scenes]),
		"legacy_mean": compute_mean([s["legacy_hard_fails"] for s in scenes]),
		"proposed_median": compute_median([s["proposed_hard_fails"] for s in scenes]),
		"proposed_mean": compute_mean([s["proposed_hard_fails"] for s in scenes]),
		"scenes": scenes
	}


def compute_median(values: list[float]) -> float:
	"""Compute median of a list of values."""
	if not values:
		return 0.0
	sorted_vals = sorted(values)
	n = len(sorted_vals)
	if n % 2 == 0:
		return (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2.0
	else:
		return float(sorted_vals[n // 2])


def compute_mean(values: list[float]) -> float:
	"""Compute mean of a list of values."""
	if not values:
		return 0.0
	return sum(values) / len(values)


def write_summary_json(summary: dict[str, Any], batch_name: str) -> None:
	"""Write summary JSON to output directory."""
	output_file = DRY_RUN_OUTPUT / f"{batch_name}_summary.json"
	with open(output_file, "w") as f:
		json.dump(summary, f, indent=2)
	print(f"Wrote: {output_file}")


def write_scenes_csv(summary: dict[str, Any], batch_name: str) -> None:
	"""Write per-scene details to CSV."""
	output_file = DRY_RUN_OUTPUT / f"{batch_name}_scenes.csv"
	scenes = summary.get("scenes", [])

	if not scenes:
		return

	with open(output_file, "w") as f:
		# Header
		f.write("scene,legacy_hard_fails,proposed_hard_fails,delta,"
				"verdict_legacy,verdict_proposed,verdict_change\n")
		# Data rows
		for scene in scenes:
			f.write(
				f"{scene['scene']},"
				f"{scene['legacy_hard_fails']},"
				f"{scene['proposed_hard_fails']},"
				f"{scene['delta']},"
				f"{scene['verdict_legacy']},"
				f"{scene['verdict_proposed']},"
				f"{scene['verdict_change']}\n"
			)
	print(f"Wrote: {output_file}")


def write_master_summary(batch_summaries: list[dict[str, Any]]) -> None:
	"""Write cross-batch summary."""
	output_file = DRY_RUN_OUTPUT / "PHASE1_DRYRUN_SUMMARY.json"
	with open(output_file, "w") as f:
		json.dump({
			"proposal_only": True,
			"phase": 1,
			"date": "2026-05-21",
			"batches": batch_summaries,
			"total_verdict_changes": sum(b.get("verdict_change_count", 0)
				for b in batch_summaries),
			"note": "Phase 1 dry run: additive fields, no semantic change to canonical scoring"
		}, f, indent=2)
	print(f"Wrote: {output_file}")


def main() -> None:
	"""Main entry point."""
	print("=" * 70)
	print("PROPOSAL PHASE 1 DRY RUN: Scorecard hardFailCount Extension Preview")
	print("=" * 70)
	print()
	print("Status: PROPOSAL ONLY. No canonical files modified.")
	print(f"Output directory: {DRY_RUN_OUTPUT}")
	print()

	ensure_output_dir()

	# Batch 1 (pre-Workstream-N, legacy scoring)
	print("Analyzing Batch 1 (pre-Workstream-N)...")
	batch1_dir = STRESS_RESULTS / "precheck_batch1"
	batch1_summary = analyze_batch("batch1", batch1_dir)
	write_summary_json(batch1_summary, "batch1")
	write_scenes_csv(batch1_summary, "batch1")

	# Batch 2-N canonical (post-Workstream-N, legacy scoring)
	print("Analyzing Batch 2-N canonical (post-Workstream-N)...")
	batch2n_canonical_dir = STRESS_RESULTS / "precheck_batch2_n_canonical"
	batch2n_summary = analyze_batch("batch2_n_canonical", batch2n_canonical_dir)
	write_summary_json(batch2n_summary, "batch2_n_canonical")
	write_scenes_csv(batch2n_summary, "batch2_n_canonical")

	# Master summary
	print("Writing master summary...")
	write_master_summary([batch1_summary, batch2n_summary])

	print()
	print("=" * 70)
	print("SUMMARY")
	print("=" * 70)
	print()
	print("Batch 1 (pre-N):")
	print(f"  Scenes: {batch1_summary.get('scene_count', 0)}")
	print(f"  Verdict changes (0 -> >0): {batch1_summary.get('verdict_change_count', 0)}")
	print(f"  Legacy median hard_fails: {batch1_summary.get('legacy_median', 0):.1f}")
	print(f"  Proposed median hard_fails: {batch1_summary.get('proposed_median', 0):.1f}")
	print()
	print("Batch 2-N canonical (post-N):")
	print(f"  Scenes: {batch2n_summary.get('scene_count', 0)}")
	print(f"  Verdict changes (0 -> >0): {batch2n_summary.get('verdict_change_count', 0)}")
	print(f"  Legacy median hard_fails: {batch2n_summary.get('legacy_median', 0):.1f}")
	print(f"  Proposed median hard_fails: {batch2n_summary.get('proposed_median', 0):.1f}")
	print()
	print("All output is PROPOSAL ONLY. No canonical files modified.")
	print()


if __name__ == "__main__":
	main()
