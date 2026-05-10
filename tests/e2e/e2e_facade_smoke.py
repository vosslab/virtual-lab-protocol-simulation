#!/usr/bin/env python3
"""
End-to-end smoke test for facade exports.

WP-1.2.3: Verify each facade exports its expected top-level keys.
- Runs Node/TS compilation and imports each facade via importTsModule.
- Checks for expected keys in each module's exports.
- Expected keys:
  - svg_assets.ts: renderEquipmentSvg, getStaticSvg, getAssetAspectRatio, getHoodBackgroundSvg, getSeroPipetteSvg, getWellPlateSvg, etc.
  - scene_configs.ts: SCENE_CONFIGS
  - inventory.ts: REAGENTS, EQUIPMENT
  - protocol.ts: PROTOCOL_ID, PROTOCOL_STEPS

This is an e2e test because it requires subprocess node/esbuild compilation.
Run directly: python3 tests/e2e/e2e_facade_smoke.py
"""

import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import git_file_utils


#============================================
def run_facade_check(repo_root: str) -> dict:
	"""
	Shell out to a Node script that imports each facade and validates its keys.
	Returns a dict with results or raises RuntimeError if validation fails.
	"""

	# Inline Node script that imports each facade and checks keys
	# Using importTsModule from tests/_compile_for_test.mjs
	# Note: We check for runtime values only (functions, constants); TypeScript types
	# do not exist at runtime and should not be tested here.
	node_script = """
import { importTsModule } from "./tests/_compile_for_test.mjs";

const results = {};

try {
	// svg_assets.ts facade - check for runtime functions
	const svgAssets = await importTsModule("src/svg_assets.ts");
	const svgKeys = [
		"renderEquipmentSvg",
		"getStaticSvg",
		"getAssetAspectRatio",
		"getHoodBackgroundSvg",
		"getSeroPipetteSvg",
		"getWellPlateSvg",
	];
	results.svg_assets = {
		present: svgKeys.filter(k => k in svgAssets),
		missing: svgKeys.filter(k => !(k in svgAssets)),
	};

	// scene_configs.ts facade - check for runtime constant
	const sceneConfigs = await importTsModule("src/scene_configs.ts");
	const sceneKeys = ["SCENE_CONFIGS"];
	results.scene_configs = {
		present: sceneKeys.filter(k => k in sceneConfigs),
		missing: sceneKeys.filter(k => !(k in sceneConfigs)),
	};

	// inventory.ts facade - check for runtime constants
	const inventory = await importTsModule("src/inventory.ts");
	const invKeys = ["REAGENTS", "EQUIPMENT"];
	results.inventory = {
		present: invKeys.filter(k => k in inventory),
		missing: invKeys.filter(k => !(k in inventory)),
	};

	// protocol.ts facade - check for runtime constants
	const protocol = await importTsModule("src/protocol.ts");
	const protoKeys = ["PROTOCOL_ID", "PROTOCOL_STEPS"];
	results.protocol = {
		present: protoKeys.filter(k => k in protocol),
		missing: protoKeys.filter(k => !(k in protocol)),
	};

	console.log(JSON.stringify(results));
	process.exit(0);
} catch (err) {
	console.error("Facade check failed: " + err.message);
	process.exit(1);
}
"""

	result = subprocess.run(
		["node", "--input-type=module"],
		input=node_script,
		cwd=repo_root,
		capture_output=True,
		text=True,
	)

	if result.returncode != 0:
		raise RuntimeError(
			f"Facade check script failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
		)

	try:
		return json.loads(result.stdout.strip())
	except json.JSONDecodeError as e:
		raise RuntimeError(
			f"Failed to parse facade check output: {e}\nOutput: {result.stdout}"
		)


#============================================
def main():
	"""
	Main entry point for e2e facade smoke test.
	"""
	repo_root = git_file_utils.get_repo_root()

	print("Running facade smoke test...")

	# Run the facade check
	try:
		results = run_facade_check(repo_root)
	except RuntimeError as e:
		print(f"ERROR: {e}", file=sys.stderr)
		sys.exit(1)

	# Validate results
	violations = []
	for facade, status in results.items():
		if status["missing"]:
			violations.append(
				f"{facade}: missing keys {status['missing']}"
			)

	if violations:
		print(
			"FAIL: Facade smoke test failed. The following facades are missing expected keys:",
			file=sys.stderr,
		)
		for v in violations:
			print(f"  {v}", file=sys.stderr)
		sys.exit(1)

	print("PASS: All facades exported expected keys.")
	sys.exit(0)


if __name__ == "__main__":
	main()
