"""Scene class detection logic.

Classifies scenes into one of five mutually exclusive classes:
1. template - declared via data-scene-mode="template"
2. zoom_detail - declared via data-scene-mode="zoom_detail"
3. dense_clutter - >=10 placements after inheritance resolution
4. instrument_heavy - primary placement is instrument/equipment kind
5. composition - default/fallback classification

The 5-step detection order is applied strictly: earlier steps take precedence.
"""

from typing import Any


class SceneClassError(Exception):
	"""Raised on invalid scene data during class detection."""
	pass


def detect(scene: dict[str, Any]) -> str:
	"""
	Detect and return the scene class as a string.

	Args:
		scene: Parsed scene YAML dict containing scene_name, data-scene-mode
			(optional), placements list, and other scene fields.

	Returns:
		One of: 'template', 'zoom_detail', 'dense_clutter', 'instrument_heavy', 'composition'.

	Raises:
		SceneClassError: If scene dict is missing required fields or invalid.

	Detection order (steps 1-5):
		1. If data-scene-mode="template" -> return 'template'
		2. If data-scene-mode="zoom_detail" -> return 'zoom_detail'
		3. If >=10 placements after inheritance -> return 'dense_clutter'
		4. If primary placement is instrument/equipment kind -> return 'instrument_heavy'
		5. Otherwise -> return 'composition'
	"""
	if not isinstance(scene, dict):
		raise SceneClassError("Scene must be a dict")

	if 'scene_name' not in scene:
		raise SceneClassError("Scene missing required field: scene_name")

	# Note: placements may be missing if the scene uses an alternative format (e.g., row-slot)
	# or if inheritance hasn't been resolved. In those cases, treat as 0 placements.

	# Step 1: Check data-scene-mode="template"
	if scene.get('data-scene-mode') == 'template':
		return 'template'

	# Step 2: Check data-scene-mode="zoom_detail"
	if scene.get('data-scene-mode') == 'zoom_detail':
		return 'zoom_detail'

	# Step 3: Check placement count >= 10
	placements = scene.get('placements', [])
	if not isinstance(placements, list):
		raise SceneClassError(f"Scene {scene['scene_name']}: placements must be a list")

	if len(placements) >= 10:
		return 'dense_clutter'

	# Step 4: Check if primary placement is instrument/equipment
	primary_class = _detect_primary_placement_class(scene)
	if primary_class in ('instrument', 'equipment'):
		return 'instrument_heavy'

	# Step 5: Default fallback
	return 'composition'


def _detect_primary_placement_class(scene: dict[str, Any]) -> str | None:
	"""
	Identify the kind of the primary placement in the scene.

	The primary placement is identified via the data-primary attribute set to
	true on a placement object. If no placement has data-primary=true, returns None.

	Args:
		scene: Parsed scene YAML dict.

	Returns:
		The 'kind' field of the primary placement, or None if no primary
		placement exists or if the kind cannot be determined.
	"""
	placements = scene.get('placements', [])
	if not isinstance(placements, list):
		return None

	for placement in placements:
		if not isinstance(placement, dict):
			continue
		if placement.get('data-primary') is True:
			# Primary placement found; return its kind if available
			return placement.get('kind')

	# No explicit primary placement; return None
	return None
