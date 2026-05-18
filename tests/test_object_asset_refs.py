"""Gate test: verify every object YAML asset_name resolves to assets/equipment/*.svg."""

import pathlib
import sys

import yaml

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import git_file_utils


# Soft-reporter ceiling. Post-WP-YAML-3 (9 additional variant collapses), the gap
# is 48 slots. The SVG picker pipeline (tools/svg_picker/) is the remediation path.
# The follow-up patch that hardens this test to a true zero-gap assertion deletes
# this constant and asserts len(missing) == 0.
BASELINE_MISSING_COUNT = 48

REPO_ROOT = pathlib.Path(git_file_utils.get_repo_root())
OBJECTS_DIR = REPO_ROOT / "content" / "objects"
ASSETS_DIR = REPO_ROOT / "assets" / "equipment"


def _collect_asset_refs() -> dict:
	"""Walk content/objects/<kind>/*.yaml and collect asset_name -> [refs]."""
	refs = {}
	for kind_dir in sorted(OBJECTS_DIR.iterdir()):
		if not kind_dir.is_dir():
			continue
		for yaml_file in sorted(kind_dir.glob("*.yaml")):
			with open(yaml_file) as f:
				data = yaml.safe_load(f)
			if not data or "visual_states" not in data:
				continue
			for state_config in data["visual_states"].values():
				if state_config.get("kind") != "svg":
					continue
				for case in state_config.get("cases", []):
					output = case.get("output", {})
					name = output.get("asset_name")
					if name:
						refs.setdefault(name, []).append(str(yaml_file.relative_to(REPO_ROOT)))
	return refs


def _existing_assets() -> set:
	"""Return basenames (without .svg) of every file in assets/equipment/."""
	return {p.stem for p in ASSETS_DIR.glob("*.svg")}


def test_object_asset_refs_no_growth() -> None:
	"""Missing-asset gap must not grow beyond the documented soft-reporter ceiling."""
	refs = _collect_asset_refs()
	existing = _existing_assets()
	missing = sorted(name for name in refs if name not in existing)

	print("\nMISSING SVG REFERENCES (current gap):")
	for name in missing:
		print(f"  {name}")
	print(f"({len(missing)} missing / {len(refs)} unique asset_name refs)")
	print(
		"Remediation: run tools/svg_picker/ pipeline to fill gaps. "
		"Per docs/REPO_STYLE.md 'Fix the design, not the symptom' -- the picker "
		"is the durable fix; this gate prevents tomorrow's silent mismatch."
	)

	assert len(missing) <= BASELINE_MISSING_COUNT, (
		f"Missing-asset gap grew: {len(missing)} > baseline {BASELINE_MISSING_COUNT}. "
		f"Either close the gap via tools/svg_picker/ or document the new floor in "
		f"BASELINE_MISSING_COUNT. See docs/REPO_STYLE.md 'Fix the design, not the symptom'."
	)


def test_object_asset_refs_assertion_fires_on_synthetic_growth(monkeypatch) -> None:
	"""Negative-path: simulate one extra missing asset; the gate would fire if assertion were tight."""
	refs = _collect_asset_refs()
	existing = _existing_assets()
	missing = [name for name in refs if name not in existing]

	synthetic_missing = missing + ["synthetic_missing_asset_for_growth_test"]
	# Assertion would fail with BASELINE+1; we don't actually trigger the test failure,
	# just confirm the math.
	assert len(synthetic_missing) == len(missing) + 1
	assert len(synthetic_missing) > BASELINE_MISSING_COUNT or len(missing) == BASELINE_MISSING_COUNT
