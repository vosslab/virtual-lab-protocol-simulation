"""Material sentinel allowlist: materials synthesized, discarded, or generically named.

These materials do not need explicit registration in materials.yaml.

Categories:
  - State sentinels (empty, mixed): generic placeholder states, not tracked materials
  - Biological identities (cells, formazan): intrinsic properties, exempt from materials.yaml
  - Disposal sinks (waste_*): containers for discarded material, not source/input materials
"""

MATERIAL_SENTINEL_ALLOWLIST = frozenset({
	"empty",
	"mixed",
	"cells",
	"formazan",
	"waste_mtt",
	"waste_media",
	"waste_drug",
	"waste_buffer",
})
