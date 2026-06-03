"""Closed built-in material-name sets used by the stepper material gate.

A written material_name (or held_material_name) value is valid when it is a
non-rendering sentinel, a built-in visible material, or a name registered in the
active protocol's materials.yaml. These two frozensets express the closed
built-in half of that rule; the registry half is looked up live. They are the
spec's closed built-in sets, not an escape hatch, so they hold exactly the
values fixed by the material vocabulary.

Source of truth: docs/specs/MATERIAL_VOCABULARY.md (sentinel/visible
classification) and docs/specs/MATERIAL_YAML_FORMAT.md (D1 validation
predicate). The closed sentinel allowlist is exactly {empty, mixed}: empty is
the only non-rendering sentinel; mixed is the only built-in visible material.
Every other written material name -- including cells, formazan, mtt, and the
waste_* streams -- is a registry-backed visible material and must be registered.
"""

# The only non-rendering sentinel: a well or vessel whose material_name is
# "empty" renders no fill and the base object art shows through unchanged. It
# resolves to a null/transparent color, never a registry lookup.
NON_RENDERING_MATERIAL_SENTINELS = frozenset({
	"empty",
})

# The only built-in visible material: "mixed" carries no tracked identity but a
# non-empty material must render, so its color is the spec-fixed built-in
# (#686868). It is never registered in materials.yaml.
BUILTIN_VISIBLE_MATERIALS = frozenset({
	"mixed",
})
