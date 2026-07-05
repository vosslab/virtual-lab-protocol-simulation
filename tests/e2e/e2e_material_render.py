#!/usr/bin/env python3
"""
Material-render regression guard.

Renders every emitted scene through the real production scene viewer (via
tests/playwright/material_render_capture.mjs) and measures how much of each
object-level fill_height() overlay's item bbox the overlay actually paints:
the overlay is screenshotted BOTH visible and hidden, and the measured
percent is the share of that item's bbox pixels that changed between the two
shots (a per-channel max-abs-diff above DIFF_THRESHOLD). This isolates the
overlay's own footprint -- glass, background, outline, and label pixels are
identical in both shots and drop out of the diff by construction, and the
same tolerance absorbs the thin anti-aliased edge band. See
tests/playwright/material_render_capture.mjs for the full rationale (the
overlay's resolved color is frequently translucent, composited per-pixel
over whatever artwork sits beneath it, so no single flat RGB target color
would match reliably).

This is a regression GUARD, not a correctness oracle: it PROVES "no worse
than baseline", NOT "material rendering is correct". It records the CURRENT
measured geometry as a baseline (docs/active_plans/reports/material_render.json)
and defends it against drift on later runs. It does not claim the baseline
percentages are individually correct; it claims they should not silently
grow (a fill overlay quietly overflowing its intended box, e.g. from a CSS
box-model or z-order regression, is the failure mode this catches).

Known-bad current state (see docs/ROADMAP.md:183, deferred fix, OUT OF SCOPE
for this guard): EVERY current fill_height overlay paints the object's full
rectangular item bbox rather than being constrained to the SVG liquid
interior, so the WHOLE baseline records known-bad current-state geometry,
not a target to imitate. This is recorded once, globally, as a top-level
"baseline_status" field in material_render.json (not an arbitrary per-object
percent threshold -- the bug is structural to the current CSS overlay
mechanism, not something a magic-number cutoff could isolate to "some"
objects). The per-entry "tag" field stays empty and reserved for future
targeted annotation once the render fix lands.

Modes:
  Baseline creation: --write-baseline, OR the first run when no baseline file
    exists yet. Writes docs/active_plans/reports/material_render.json.
  Verification (default, once a baseline exists): compares the current run
    against the stored baseline per (scene, placement_name, field_name) entry.
    An entry is REGRESSED when its measured percent is more than
    REGRESSION_THRESHOLD_PP percentage points ABOVE its baseline value.
    Verification never rewrites the baseline file.

Output:
  docs/active_plans/reports/material_render.json  -- the baseline (write mode only)
  docs/active_plans/reports/material_render.md     -- summary report (every run)
  test-results/material_render/                    -- capture PNGs + capture.json (gitignored)

Run:
  source source_me.sh && python3 tests/e2e/e2e_material_render.py
  source source_me.sh && python3 tests/e2e/e2e_material_render.py --write-baseline

Exit code:
  0: harness ran to completion with no regression found (or baseline written).
  Uncaught RuntimeError (nonzero exit): a regression was found, or the
  capture step itself failed (missing dist/, missing Playwright browser).
"""

# Standard Library
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime, timezone

# PIP3 modules
import numpy
import PIL.Image

# Resolve repo root via git so this script works from any cwd.
_GIT_RESULT = subprocess.run(
	["git", "rev-parse", "--show-toplevel"],
	capture_output=True,
	text=True,
	check=True,
)
REPO_ROOT = Path(_GIT_RESULT.stdout.strip())

CAPTURE_MJS = REPO_ROOT / "tests" / "playwright" / "material_render_capture.mjs"
CAPTURE_OUT_DIR = REPO_ROOT / "test-results" / "material_render"
REPORTS_DIR = REPO_ROOT / "docs" / "active_plans" / "reports"
JSON_BASELINE = REPORTS_DIR / "material_render.json"
MD_REPORT = REPORTS_DIR / "material_render.md"

# Per-channel (R/G/B) max-abs-diff above which a pixel counts as "changed" by
# hiding the fill overlay. Loose enough to absorb one-pixel AA edge noise,
# tight enough that unrelated background dithering does not count.
DIFF_THRESHOLD = 15

# A verified entry is regressed only when it grew MORE than this many
# percentage points above its recorded baseline value.
REGRESSION_THRESHOLD_PP = 5.0

# The baseline-wide known-bad label: EVERY current fill_height overlay paints
# the object's full rectangular item bbox rather than being constrained to
# the SVG liquid interior (docs/ROADMAP.md:183, deferred, out of scope for
# this guard). This is a single global statement, not a per-object percent
# threshold -- the bug is structural to the current CSS overlay mechanism
# (every object uses the same bottom-anchored, full-width overlay div), so no
# magic-number cutoff could correctly separate "affected" from "unaffected"
# objects; a 0%-measured entry (no material present right now) is exactly as
# affected as a 95%-measured one the moment material is added.
BASELINE_STATUS = "known-bad-current-state"
BASELINE_STATUS_NOTE = (
	"Every fill_height overlay in this baseline currently paints the full "
	"object item bbox rather than being constrained to the SVG liquid "
	"interior (docs/ROADMAP.md:183, deferred fix, out of scope for this "
	"guard). All measured percentages below are CURRENT-STATE geometry, not "
	"a target to imitate; the guard only blocks this state from getting "
	"worse. The per-entry \"tag\" field stays empty and reserved for future "
	"targeted annotation once the render fix lands."
)


#============================================
def parse_args() -> argparse.Namespace:
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(
		description="Material-render regression guard: baseline or verify fill-overlay geometry."
	)
	parser.add_argument(
		"-w", "--write-baseline",
		dest="write_baseline",
		action="store_true",
		help="Write/refresh the baseline instead of verifying against it.",
	)
	args = parser.parse_args()
	return args


#============================================
def run_capture(out_dir: Path) -> dict:
	"""Run the Playwright capture script and load its output.

	Args:
		out_dir: Directory the capture script writes PNGs + capture.json into.

	Returns:
		Parsed capture.json payload.
	"""
	out_dir.mkdir(parents=True, exist_ok=True)
	print(f"Capturing fill-overlay geometry into {out_dir} ...")
	result = subprocess.run(
		["node", "--import", "tsx", str(CAPTURE_MJS), str(out_dir)],
		cwd=str(REPO_ROOT),
		capture_output=False,
		text=True,
	)
	if result.returncode != 0:
		raise RuntimeError(
			f"material_render_capture.mjs exited {result.returncode}; "
			"see its stderr above. Common cause: dist/ is stale -- run "
			"bash build_github_pages.sh first."
		)
	capture_path = out_dir / "capture.json"
	if not capture_path.exists():
		raise RuntimeError(f"Capture did not produce {capture_path}")
	with open(capture_path) as f:
		return json.load(f)


#============================================
def measure_item_percent(before_img: PIL.Image.Image, after_img: PIL.Image.Image, bbox: dict) -> float:
	"""Measure the percent of an item's bbox that the fill overlay painted.

	Args:
		before_img: Full-scene screenshot with the fill overlay visible.
		after_img: Same scene, same viewport, with the fill overlay hidden.
		bbox: {x, y, w, h} in the same pixel coordinate frame as both images.

	Returns:
		Percent (0-100) of bbox pixels whose color changed beyond DIFF_THRESHOLD.
	"""
	# Clamp the crop rect to the image bounds; a bbox flush against the
	# viewport edge can round outside by a sub-pixel amount.
	x0 = max(0, int(bbox["x"]))
	y0 = max(0, int(bbox["y"]))
	x1 = min(before_img.width, int(bbox["x"] + bbox["w"]))
	y1 = min(before_img.height, int(bbox["y"] + bbox["h"]))
	if x1 <= x0 or y1 <= y0:
		return 0.0

	crop_before = numpy.asarray(before_img.crop((x0, y0, x1, y1)), dtype=numpy.int16)
	crop_after = numpy.asarray(after_img.crop((x0, y0, x1, y1)), dtype=numpy.int16)

	total = crop_before.shape[0] * crop_before.shape[1]
	if total == 0:
		return 0.0
	# Per-pixel max-abs-diff across the R/G/B channels (axis -1), then count
	# how many pixels exceed the tolerance.
	channel_diff = numpy.abs(crop_before - crop_after).max(axis=-1)
	changed = int((channel_diff > DIFF_THRESHOLD).sum())
	return 100.0 * changed / total


#============================================
def build_current_measurements(capture_data: dict, out_dir: Path) -> dict[str, dict]:
	"""Measure every captured item and key the results by scene::placement_name.

	Args:
		capture_data: Parsed capture.json payload.
		out_dir: Directory containing the referenced PNGs.

	Returns:
		Dict keyed by "{scene}::{placement_name}::{field_name}" -> result dict.
		field_name disambiguates a single item that carries more than one
		fill overlay (an object tracking two independent liquid levels, e.g.
		an electrophoresis tank's inner/outer chamber).
	"""
	current: dict[str, dict] = {}
	for scene_record in capture_data["scenes"]:
		if scene_record["png_before"] is None:
			continue
		before_img = PIL.Image.open(out_dir / scene_record["png_before"]).convert("RGB")
		# Cache the (possibly shared) "after" image per filename: several items
		# with the same driving field name reuse one isolated screenshot.
		after_images: dict[str, PIL.Image.Image] = {}
		for item in scene_record["items"]:
			after_name = item["png_after"]
			if after_name not in after_images:
				after_images[after_name] = PIL.Image.open(out_dir / after_name).convert("RGB")
			pct = measure_item_percent(before_img, after_images[after_name], item["bbox"])
			key = f"{scene_record['scene']}::{item['placement_name']}::{item['field_name']}"
			current[key] = {
				"scene": scene_record["scene"],
				"placement_name": item["placement_name"],
				"object_name": item["object_name"],
				"field_name": item["field_name"],
				"css_color": item["css_color"],
				"measured_percent": round(pct, 2),
			}
	return current


#============================================
def load_baseline() -> dict | None:
	"""Load the stored baseline JSON, or None when it does not exist yet.

	Returns:
		Parsed baseline payload, or None.
	"""
	if not JSON_BASELINE.exists():
		return None
	with open(JSON_BASELINE) as f:
		return json.load(f)


#============================================
def write_baseline(current: dict[str, dict]) -> dict:
	"""Write a fresh baseline. Every entry's "tag" stays empty and reserved.

	The known-bad label is recorded ONCE, globally, as the top-level
	"baseline_status" field (see BASELINE_STATUS / BASELINE_STATUS_NOTE): the
	whole baseline is current-state geometry from the documented full-bbox
	fill limitation, not a per-object judgment call, so no per-entry
	threshold is applied here.

	Args:
		current: Freshly measured entries, keyed by "scene::placement_name::field_name".

	Returns:
		The new baseline payload that was written.
	"""
	new_entries: dict[str, dict] = {
		key: {**measurement, "tag": ""} for key, measurement in current.items()
	}

	payload = {
		"baseline_status": BASELINE_STATUS,
		"baseline_status_note": BASELINE_STATUS_NOTE,
		"meta": {
			"generated_at": datetime.now(timezone.utc).isoformat(),
			"diff_threshold": DIFF_THRESHOLD,
			"regression_threshold_pp": REGRESSION_THRESHOLD_PP,
			"entry_count": len(new_entries),
		},
		"entries": new_entries,
	}
	REPORTS_DIR.mkdir(parents=True, exist_ok=True)
	with open(JSON_BASELINE, "w") as f:
		json.dump(payload, f, indent=2, sort_keys=True)
	print(f"Baseline written: {JSON_BASELINE} ({len(new_entries)} entries)")
	return payload


#============================================
def compare_against_baseline(current: dict[str, dict], baseline: dict) -> dict:
	"""Compare current measurements against the stored baseline.

	Args:
		current: Freshly measured entries, keyed by "scene::placement_name".
		baseline: The loaded baseline payload.

	Returns:
		Dict with "regressed", "new_keys", "missing_keys", "unchanged_count".
	"""
	entries = baseline["entries"]
	regressed = []
	new_keys = []
	unchanged_count = 0

	for key, measurement in current.items():
		if key not in entries:
			new_keys.append(key)
			continue
		baseline_pct = entries[key]["measured_percent"]
		diff_pp = measurement["measured_percent"] - baseline_pct
		if diff_pp > REGRESSION_THRESHOLD_PP:
			regressed.append({
				"key": key,
				"baseline_percent": baseline_pct,
				"current_percent": measurement["measured_percent"],
				"diff_pp": round(diff_pp, 2),
			})
		else:
			unchanged_count += 1

	missing_keys = [key for key in entries if key not in current]

	return {
		"regressed": regressed,
		"new_keys": new_keys,
		"missing_keys": missing_keys,
		"unchanged_count": unchanged_count,
	}


#============================================
def write_markdown_report(
	mode: str,
	current: dict[str, dict],
	comparison: dict | None,
) -> None:
	"""Write the material-render Markdown summary report.

	Args:
		mode: "baseline" or "verify".
		current: Freshly measured entries.
		comparison: The compare_against_baseline() result (verify mode only).
	"""
	md = "# Material-render regression guard report\n\n"
	md += "**This report proves \"no worse than baseline\", NOT \"material "
	md += "rendering is correct\".** It records how much of each fill_height() "
	md += "overlay's item bbox the overlay actually paints, and defends that "
	md += "geometry against drift; it does not judge whether any individual "
	md += "percent is the right answer.\n\n"
	md += "**Segmentation rule (how the numerator is counted):** each item's "
	md += "bbox is screenshotted with its fill overlay(s) visible, then again "
	md += "with them hidden (isolated per driving field, so a two-overlay item "
	md += "is never diffed against itself). A pixel counts toward the "
	md += "numerator when its color changes by more than the diff threshold "
	md += "between the two shots. Glass, background, outline, and label "
	md += "pixels are IDENTICAL in both shots and drop out by construction; "
	md += "the same threshold absorbs the thin anti-aliased edge band. See "
	md += "tests/playwright/material_render_capture.mjs for the full "
	md += "rationale (the overlay's resolved color is frequently translucent "
	md += "and composited per-pixel over the base artwork, so no single flat "
	md += "target color would match reliably).\n\n"
	md += f"**Baseline status: `{BASELINE_STATUS}`.** {BASELINE_STATUS_NOTE}\n\n"
	md += f"**Mode:** {mode}  \n"
	md += f"**Items measured:** {len(current)}  \n"
	md += f"**Diff threshold:** {DIFF_THRESHOLD} (per-channel max-abs-diff)  \n"
	md += f"**Regression threshold:** +{REGRESSION_THRESHOLD_PP} percentage points above baseline  \n\n"

	if comparison is not None:
		md += "## Verification summary\n\n"
		md += "| Outcome | Count |\n"
		md += "| --- | --- |\n"
		md += f"| unchanged (within threshold) | {comparison['unchanged_count']} |\n"
		md += f"| regressed | {len(comparison['regressed'])} |\n"
		md += f"| new (no baseline entry yet) | {len(comparison['new_keys'])} |\n"
		md += f"| missing (baseline entry, no longer captured) | {len(comparison['missing_keys'])} |\n\n"

		if comparison["regressed"]:
			md += "## Regressed entries\n\n"
			md += "| Key | Baseline % | Current % | Diff (pp) |\n"
			md += "| --- | --- | --- | --- |\n"
			for row in sorted(comparison["regressed"], key=lambda r: r["key"]):
				md += (
					f"| `{row['key']}` | {row['baseline_percent']:.2f} | "
					f"{row['current_percent']:.2f} | +{row['diff_pp']:.2f} |\n"
				)
			md += "\n"

		if comparison["new_keys"]:
			md += "## New entries (no baseline yet)\n\n"
			md += "Run with `--write-baseline` to add these to the baseline.\n\n"
			for key in sorted(comparison["new_keys"]):
				md += f"- `{key}`\n"
			md += "\n"

		if comparison["missing_keys"]:
			md += "## Missing entries (baselined, not captured this run)\n\n"
			for key in sorted(comparison["missing_keys"]):
				md += f"- `{key}`\n"
			md += "\n"

	md += "## Full measured corpus\n\n"
	md += "Every row below is known-bad current-state geometry (see "
	md += "**Baseline status** above); the per-entry `tag` column stays empty "
	md += "and reserved for future targeted annotation once the render fix "
	md += "for docs/ROADMAP.md:183 lands.\n\n"
	md += "| Key | Object | Declared fill color | Measured % | Tag |\n"
	md += "| --- | --- | --- | --- | --- |\n"
	for key in sorted(current):
		entry = current[key]
		md += (
			f"| `{key}` | `{entry['object_name']}` | `{entry['css_color']}` | "
			f"{entry['measured_percent']:.2f} | |\n"
		)

	REPORTS_DIR.mkdir(parents=True, exist_ok=True)
	with open(MD_REPORT, "w") as f:
		f.write(md)
	print(f"Markdown report: {MD_REPORT}")


#============================================
def main() -> None:
	"""Main entry point."""
	args = parse_args()

	capture_data = run_capture(CAPTURE_OUT_DIR)
	current = build_current_measurements(capture_data, CAPTURE_OUT_DIR)
	print(f"Measured {len(current)} fill-overlay item(s).")

	old_baseline = load_baseline()
	should_write = args.write_baseline or old_baseline is None

	if should_write:
		write_baseline(current)
		write_markdown_report("baseline", current, None)
		print("=== Baseline written; nothing to verify this run. ===")
		return

	comparison = compare_against_baseline(current, old_baseline)
	write_markdown_report("verify", current, comparison)

	print("\n=== Verification summary ===")
	print(f"unchanged={comparison['unchanged_count']}, "
		f"regressed={len(comparison['regressed'])}, "
		f"new={len(comparison['new_keys'])}, "
		f"missing={len(comparison['missing_keys'])}")

	if comparison["regressed"]:
		lines = [
			f"  {row['key']}: {row['baseline_percent']:.2f}% -> "
			f"{row['current_percent']:.2f}% (+{row['diff_pp']:.2f}pp)"
			for row in comparison["regressed"]
		]
		raise RuntimeError(
			f"{len(comparison['regressed'])} material-render regression(s) found "
			f"(>{REGRESSION_THRESHOLD_PP}pp above baseline):\n" + "\n".join(lines)
		)


if __name__ == "__main__":
	main()
